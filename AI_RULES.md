# AI Rules

DoUKnowBall: a multi-sport trivia, puzzle and simulation site. Deep background lives in
`CLAUDE.md` and `docs/`. This file is the short version every session needs.

## Tech stack

- **React 18 + TypeScript**, built with **Vite** (SWC plugin). All source lives in `src/`.
- **React Router (react-router-dom v7)** for routing. Routes stay in `src/App.tsx`, lazy loaded.
- **Tailwind CSS** for all styling, plus `tailwindcss-animate` and `@tailwindcss/typography`.
- **shadcn/ui** (Radix primitives) in `src/components/ui/` as the component library.
- **lucide-react** for icons.
- **Supabase** (`@supabase/supabase-js`) for the database, auth and edge functions.
- **TanStack Query** for server state; React state and custom hooks for game state.
- **react-helmet-async** for per-page head tags, which is what the prerenderer captures.
- **Vitest + Testing Library (jsdom)** for unit tests; `scripts/sim*.mjs` harnesses for sims.

## Library rules

| Need | Use | Never |
|---|---|---|
| UI components | shadcn/ui from `src/components/ui/` | Hand-rolled dialogs, MUI, Bootstrap |
| Styling | Tailwind utility classes | Inline style objects, CSS modules, styled-components |
| Icons | `lucide-react` | Icon fonts, raw SVG dumps, league logos |
| Routing | `react-router-dom` in `src/App.tsx` | Route definitions scattered in pages |
| Forms | `react-hook-form` + `zod` via `@hookform/resolvers` | Manual form state |
| Toasts | `sonner` (`src/components/ui/sonner.tsx`) | `alert()`, custom toast systems |
| Charts | `recharts` | New chart dependencies |
| Dates | `date-fns` plus `src/lib/dateUtils.ts` | Moment, hand-rolled date math |
| Head tags / SEO | `react-helmet-async` via `src/components/seo/PageSeo.tsx` | Direct `document.title` writes |
| Remote data | `src/lib/fetch*.ts` helpers + TanStack Query | Ad-hoc `fetch` in components |
| Class merging | `cn()` from `src/lib/utils.ts` | Manual string concatenation |

Everything listed is already installed. Do not add a new dependency when one of these covers
the need.

## Project structure

- `src/pages/` one component per game or screen. `src/pages/Index.tsx` is the home page.
- `src/components/<game>/` game-specific UI. `src/components/game/` shared game shell (nav,
  how-to-play, share, result screen). `src/components/ui/` is shadcn, do not edit those files;
  wrap them in a new component instead.
- `src/hooks/` game loops and stateful logic. `src/lib/` pure logic and helpers.
  `src/types/` shared types. `src/data/` static content and the game registry.
- `src/integrations/supabase/client.ts` the only Supabase entry point.

## Hard rules

- **Supabase:** always import `supabase`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from
  `@/integrations/supabase/client`. Never read `VITE_SUPABASE_*` env vars, they point at a
  deleted project.
- **A new sport is data, not a new engine.** Reuse the existing hook or lib for career, manager,
  grid, connect4 and front office games and inject the sport. Fix a bug in every sibling that
  shares the shape.
- **Adding a game:** page in `src/pages/`, lazy route in `src/App.tsx`, `GameDef` entry in
  `src/data/gameRegistry.ts`, SEO copy in `src/data/gameContent/`, sim harness named
  `scripts/sim*.mjs`.
- **Every game needs how-to-play rules** shown before play and re-openable from a "?" button.
- **Hooks come before any early return.** A loading check above a `useState` causes React #310.
- **Never draw from `Math.random` inside a `useState` initialiser.** Use `src/lib/firstDraw.ts`.
- **Nothing computed from the clock goes into prerendered markup.** Mark volatile blocks with
  `data-no-prerender`.
- **Validators fail closed.** Return `{valid:false, unverified:true, reason:"...try again"}` on
  any error; never accept on error.
- **No em dashes or en dashes anywhere.** No league or club logos, crests, kits or player photos.
  No invented quotes attributed to real people. No rival product names in shipped files.
- **Type gate:** `node_modules/.bin/tsc --noEmit -p tsconfig.app.json` must be at zero. Plain
  `tsc` is a no-op here.
