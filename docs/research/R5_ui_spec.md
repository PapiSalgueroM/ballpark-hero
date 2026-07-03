# R5: UI/UX Spec for the DoUKnowBall Visual Overhaul

Research and spec date: July 2026. Scope: design tokens, component anatomy, animation, mobile, accessibility, and migration order for a site-wide UI pass across 65 games. No code was changed to produce this document, current behavior was read directly from `src/index.css`, `tailwind.config.ts`, `src/pages/Index.tsx`, `src/components/game/*`, `src/pages/HigherLowerTransfers.tsx`, and `src/pages/Footle.tsx`.

## Executive summary (read this first)

1. The bones are already good: a real dark HSL token system, a correct/close/incorrect semantic color set, a display/body font split (Space Grotesk / Inter), and shadcn/ui wired through `tailwind-merge` and `tailwindcss-animate`. This is an evolution job, not a rebuild.
2. The single biggest inconsistency is that two eras of pages coexist with no shared shell: Footle (older, `max-w-7xl`, difficulty pills, legend row, modal-based rules) and HigherLowerTransfers (newer, `max-w-2xl`, tighter card language, inline rules) both work but look like different products sitting behind the same nav.
3. Every game hand-rolls its own header, its own result-screen card, and its own emoji-grid string. There is no `<GameShell>`, no `<ResultCard>`, no `<StatTile>`. `GameSeoContent`, `Footer`, `GameNav`, `ShareButtons`, `GameNavbar` are the only truly shared pieces, everything between the navbar and the SEO block is bespoke per page.
4. Spacing and radius drift sitewide: `rounded-xl` (0.75rem via `--radius`), `rounded-2xl`, and `rounded-full` all appear as the "main card" radius depending on which page you land on, and vertical rhythm ranges from `mb-4` to `mb-8` for equivalent header-to-content gaps.
5. Two different capitalization voices for game titles exist side by side: Footle and HigherLowerTransfers both use `tracking-[0.2xem]` uppercase hero titles, but Index.tsx uses sentence-case, and GameNav card titles use title-case. This is a good pattern (the letter-spaced uppercase display title is genuinely strong, on-brand, and Wordle-adjacent) that just needs to become the rule, not the exception.
6. Competitor research (Wordle, Connections, Poeltl, Futbol11, Immaculate Grid) converges hard on a small set of conventions we are only partly using: green/yellow/gray (we already have correct/close/incorrect, keep it), a flip or pop reveal per tile (we have zero tile-reveal animation in either audited page), a copy-to-clipboard emoji grid (we already built this well in `ShareButtons`/`ShareCard`), and a first-visit rules modal (we have this in Footle via `HowToPlay`, but it is not a shared component other games can reuse).
7. Nothing here requires new color families or a new visual identity. The plan is to formalize the dark green-on-charcoal palette that already exists, add 2 to 3 missing tokens (elevated surface, warning/gold as a first-class token instead of inline `hsl(43,85%,55%)` literals scattered across files), and tighten the type/spacing/radius scale into a documented system.
8. Tile-reveal, shake-on-wrong, and pop-on-correct are the three animations with the highest perceived-polish return and can all ship with pure CSS keyframes already compatible with `tailwindcss-animate`, no new library needed.
9. Mobile is functionally fine (both audited pages are single-column and readable at 375px) but is not designed for the vertical-screenshot share moment: result cards do not reserve safe margins, do not guarantee one-screen-fits-all at 9:16, and the emoji grid is plain `<pre>` text rather than a styled block matching the surrounding card.
10. Recommended order: ship the token and shell layer first (S), then the result-screen and stat-tile primitives (M), then re-skin Footle and 3 to 5 other older pages to prove the shell handles a modal-heavy game before rolling it across all 65.

---

## Part 1: Audit of the current UI

### What already works, keep this

- **The dark palette has real bones.** `--background: 225 25% 6%` (near-black navy-charcoal) against `--primary: 152 60% 42%` (a grass green) is a legitimately good "sporty dark mode" pairing, distinct from generic dark-gray SaaS themes and distinct from Wordle's black-and-white-and-green. Do not replace it.
- **Semantic feedback colors already exist as first-class Tailwind tokens.** `correct` / `close` / `incorrect` are defined in both `index.css` and `tailwind.config.ts` and are already used correctly in `HowToPlay.tsx` and Footle's legend row. This is exactly the Wordle green/yellow/gray convention, already done right. It should be the backbone of every new tile component, not reinvented per game.
- **Type family split is correct and already loaded.** Space Grotesk for display/headings, Inter for body, both declared in `tailwind.config.ts` (`fontFamily.display` / `fontFamily.body`) and applied globally in `index.css` (`h1..h6` get the display family via a `@layer base` rule). This mirrors how NYT Games and most competitor sites separate a geometric display face from a readable body face.
- **shadcn/ui plus `tailwindcss-animate` is already wired correctly.** `dialog.tsx` ships `data-[state=open]:animate-in`/`zoom-in-95`/`slide-in-from-top-[48%]` out of the box. Every animation recommendation in Part 5 below builds on utility classes that are already available with zero new dependencies.
- **`ShareButtons` and `ShareCard` are further along than the audit brief assumed.** There is already a working `html2canvas`-based image export (`handleSaveImage`), a branded off-screen card component with the DoUKnowBall wordmark and inline hex colors chosen specifically so `html2canvas` rasterizes consistently regardless of CSS variables, and five native share targets (X, WhatsApp, Instagram-via-clipboard, Gmail, Messages). This is a genuinely strong foundation, the gap is consistency of what feeds into it (see Problem 4 below), not the component itself.
- **`GameNav`'s "Play Next" pattern is a good, already-built retention primitive.** Category-aware random suggestion with a card, emoji, description, and CTA. It needs a visual refresh (see Component Anatomy) but the logic and placement are right.
- **The non-affiliation footer disclaimer and Privacy/Terms links are already standardized** via the shared `Footer` component used on both audited pages.

### Problem 1: Two page shells with no shared contract

Footle wraps content in `max-w-7xl mx-auto px-4 py-6 md:py-10`. HigherLowerTransfers wraps content in `max-w-2xl mx-auto px-4 py-6 md:py-10`. Both are reasonable widths for their content (Footle's board plus suggestion list genuinely wants more horizontal room than a two-card higher/lower comparison), but neither page declares that width choice as an intentional decision, it is just whatever the original author picked. Multiply this by 65 games and the site has no consistent "how wide is a game page" rule, which is the root cause of the "different products" feeling raised in the executive summary.

### Problem 2: No shared result-screen component

Footle's game-over state is a hand-built `<div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">` containing an emoji, a heading, a stat line, a "did you know" fact, `ShareButtons`, `PostGameStats`, and a conditional CTA. HigherLowerTransfers's game-over state is a separately hand-built `<div className="bg-card border border-border rounded-2xl p-6 text-center mt-4">` containing a different emoji-selection ternary, a different heading style, a `<pre>` emoji grid, `ShareButtons`, and a different CTA. The two are 80% structurally identical (icon, heading, stat, share, replay) and 20% different (Footle has `PostGameStats`, HigherLowerTransfers has an inline `<pre>` grid, the padding differs `p-8` vs `p-6`, the radius differs implicitly through different max-widths). This is exactly the kind of near-duplicate that should be one `<ResultScreen>` component with slots, not two independent trees.

### Problem 3: Spacing and radius drift

Across just these two files: `rounded-xl` (Footle's search/legend chips), `rounded-2xl` (both result cards, HigherLowerTransfers's stat cards), `rounded-full` (mode toggle, difficulty pills, CTA buttons). All three radii are used as "the" card radius somewhere on the site with no documented rule for which content type gets which radius. Vertical spacing between header and content ranges from `mb-6` to `mb-8` to `mt-10` for what is conceptually the same gap (end of header block, start of interactive content) depending on the page.

### Problem 4: Title voice is inconsistent

Footle: `FOOTLE` in `text-5xl md:text-7xl font-bold tracking-[0.25em]`. HigherLowerTransfers: `TRANSFER MARKET` in `text-4xl md:text-5xl font-bold tracking-[0.08em]`. Both are uppercase-tracked display titles (good, on-brand, Wordle/NYT-adjacent), but the tracking value, size step, and whether the game name is one word or two words differs with no documented scale. Index.tsx's hero title `DoUKnowBall` is sentence-case with no letter-tracking at all, a third voice for what is conceptually the same "biggest text on the page" role.

### Problem 5: Feedback and reveal have no motion

Neither Footle's `GameBoard` cells nor HigherLowerTransfers's card-flip-to-reveal-value moment animate. `index.css` defines exactly one custom keyframe sitewide, `cell-reveal` (a `scaleY` reveal used somewhere in the grid family, not exercised by either audited page). Competitor research (Part 2 below) confirms tile-flip-on-submit and shake-on-invalid are treated as load-bearing polish by every major competitor, this is the single most visible "why does theirs feel more premium" gap.

### Problem 6: Emoji-grid and share-card content is inconsistently built per page

HigherLowerTransfers builds its own one-line `emojiGrid` string (`📈 Transfer Market streak: ${streak}...`) and renders it in a raw `<pre>` tag styled with only `text-sm tracking-wide whitespace-pre-wrap`. Footle passes no `emojiGrid` at all to `ShareButtons`, meaning its share card and copy-to-clipboard card omit the grid entirely, an inconsistency the owner's own backlog already flags (task #26, #115). The underlying `ShareCard` component handles a missing `emojiGrid` gracefully, but the resulting shared asset differs in richness by game with no visual system deciding what a grid should look like when a game genuinely doesn't have one (e.g., Footle's guess-count result versus HigherLowerTransfers's streak result).

### Problem 7: How-to-Play is a single hardcoded component, not a pattern

`HowToPlay.tsx` is fully Footle-specific (the copy literally says "Guess the mystery soccer player in 8 tries" and hardcodes Footle's exact close-thresholds and difficulty tiers). It cannot be reused by any other game without either forking the file or awkwardly overloading its content. This blocks the owner's own backlog item #23 (rules on game entry for every game) and #107 (rewrite every How to Play in plain language) from having a single component to fix once.

### Problem 8: Inline literal colors leak outside the token system

Both Index.tsx and Footle use raw `hsl(43,85%,55%)` and `hsl(43,85%,55%)/15` literals for a gold "New"/"PB" accent instead of a named token, and `GameNavbar` uses raw Tailwind `text-yellow-500`, `text-orange-500` for its points/streak icons rather than a themed color. This means the "gold" accent color exists in the codebase but not in the design system, so nobody editing `index.css` alone would know it needs to survive a token refactor.

---

## Part 2: Design tokens spec

Principle: **evolve, do not replace.** Every existing CSS variable name is kept. We add new variables (never delete or rename existing ones) and only adjust numeric values where the audit found a real inconsistency (the gold accent) or a real gap (elevated surface, focus ring width). This keeps every existing `bg-card`, `text-primary`, `border-border` call site working unmodified.

### 2.1 Color tokens to add to `src/index.css`

Add these inside the existing `:root` block in `@layer base`, directly after the existing `--sg-accent` line so the new sport-accent-style tokens sit together:

```css
    /* --- R5 additions: promote inline literals to named tokens --- */
    --gold: 43 85% 55%;
    --gold-foreground: 225 25% 8%;
    --gold-muted: 43 60% 20%;

    --surface-1: 225 20% 11%;   /* same value as --card today, named for clarity */
    --surface-2: 225 18% 14%;   /* one step up, for nested cards / stat tiles inside a card */
    --surface-3: 225 16% 18%;   /* two steps up, for the active/selected state of a tile */

    --success-glow: 142 71% 45% / 0.35;   /* correct-colored glow, used in box-shadow on win states */
    --warn: 25 90% 55%;                    /* orange, distinct from --close gold-yellow, for streak/fire icons */
    --warn-foreground: 0 0% 100%;

    --focus-ring-width: 3px;
```

Rationale per token:
- `--gold` / `--gold-foreground` / `--gold-muted`: replaces every inline `hsl(43,85%,55%)` literal found in `Index.tsx` (New badge, PB text, social-proof icon) and any future gold accent (streak flame, "Daily" badge glow, star ratings). `--gold-foreground` is a near-black so gold text/badges stay legible on both light-on-gold and gold-on-dark uses.
- `--surface-1/2/3`: solves the "what radius/background does a tile nested inside a card get" problem from Problem 3. `--surface-1` equals today's `--card` value exactly (11% lightness) so this is additive, not a repaint. `--surface-2` and `--surface-3` give stat tiles and selected states a real elevation ladder instead of ad-hoc `bg-card/80`, `bg-secondary`, `bg-muted/30` choices currently scattered across `Index.tsx` and the game pages.
- `--success-glow`: a reusable `box-shadow` color for the "correct" pop animation (Part 5), stored as an HSL-with-alpha so it composes with `shadow-[0_0_24px_hsl(var(--success-glow))]`.
- `--warn`: `GameNavbar`'s streak flame currently hardcodes Tailwind's `orange-500`. Promoting it to a token means every fire/streak icon sitewide can share one value and survive a future rebrand.
- `--focus-ring-width`: documents the focus-ring size decision made in Part 7 (Accessibility) as a single source of truth rather than a magic number repeated in every `focus:ring-2` call.

### 2.2 Tailwind config additions (`tailwind.config.ts`)

Extend `theme.extend.colors` (do not touch existing entries):

```ts
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
          muted: "hsl(var(--gold-muted))",
        },
        warn: {
          DEFAULT: "hsl(var(--warn))",
          foreground: "hsl(var(--warn-foreground))",
        },
        surface: {
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
        },
```

This turns every future `hsl(43,85%,55%)` literal into `text-gold`, `bg-gold/15`, `bg-gold-muted`, and every ad-hoc nested-card background into `bg-surface-2`, `bg-surface-3`, directly usable in JSX without a style prop.

### 2.3 Type scale

Formalize what already exists as a documented ladder instead of per-page guesswork. All values are existing Tailwind defaults, this section is a naming convention, not a new font-size scale:

| Role | Class | Size / line-height | Font | Used for |
|---|---|---|---|---|
| Hero display | `text-5xl md:text-7xl font-display font-bold tracking-[0.15em] uppercase` | 3rem to 4.5rem | Space Grotesk | Home hero title only (`DoUKnowBall`) |
| Game title | `text-4xl md:text-6xl font-display font-bold tracking-[0.15em] uppercase` | 2.25rem to 3.75rem | Space Grotesk | Every game page's `<h1>`. Fixes Problem 4: one tracking value (`0.15em`, splitting the difference between Footle's `0.25em` and Transfer Market's `0.08em`), one size step, always uppercase. |
| Section heading | `text-lg font-display font-bold` | 1.125rem | Space Grotesk | "Play Next", category headers on home, result-screen `<h2>` |
| Body | `text-sm md:text-base` | 0.875 to 1rem | Inter | Descriptions, instructions, card copy |
| Caption / label | `text-xs uppercase tracking-wider text-muted-foreground` | 0.75rem | Inter | Stat tile labels, "Share your result", tag chips |
| Micro | `text-[10px] uppercase tracking-[0.15em]` | 0.625rem | Inter | "Most Played Today" eyebrow, badge text (Daily/New/PB) |

### 2.4 Spacing scale

Document a fixed vertical-rhythm ladder to kill Problem 3's drift. Use these exact gaps as the only choices for the listed roles:

- Header block bottom margin (`<header>` to first interactive element): `mb-6` on mobile, `md:mb-8` on desktop. Always this pair, never `mb-4` or `mt-10`.
- Card internal padding: `p-5` for a primary result/action card, `p-4` for a secondary/nested tile, `p-3` for a compact chip/row item. (Currently Footle uses `p-8`, HigherLowerTransfers uses `p-6`, neither is wrong in isolation but the site needs one number per role.)
- Card-to-card gap in a grid or list: `gap-3` for dense grids (game cards on home), `gap-4` for a looser stack (stat tiles in a result screen).
- Section-to-section gap on a long page (home, SEO block, GameNav, Footer): `space-y-10` at the container level, already used correctly in `Index.tsx`, extend this convention to every game page's bottom stack instead of the current ad-hoc `mt-8`/`mt-10`/`mt-12` mix.

### 2.5 Radius scale

Formalize a strict content-type-to-radius mapping instead of the current "whichever radius the original author reached for" pattern:

- `rounded-full`: pills, toggles, avatar circles, primary/secondary action buttons only.
- `rounded-2xl` (`1rem`, one step above the existing `--radius: 0.75rem` default): the outer shell of any result screen, hero card, or "big" container (this is the one new radius value; everything else reuses existing `--radius` math).
- `rounded-xl` (`--radius`, already `0.75rem`): default card radius, used for game cards on home, stat tiles, search inputs, dialogs.
- `rounded-lg` (`calc(var(--radius) - 2px)`, already defined): nested/inner elements inside a `rounded-xl` card (an icon chip inside a stat tile, for example), so nested corners visually nest rather than compete.

No new CSS variable is needed for radius, this section is purely a usage rule to add to a component-library README or Storybook-equivalent once shared components exist.

### 2.6 Shadows

Add two shadow utilities as Tailwind arbitrary values (no new token needed, these are one-off enough not to warrant a CSS variable, but are specified here so every implementer uses the same numbers):

- Result-screen elevation: `shadow-xl` (existing Tailwind default, already used in Footle's result card, keep it as the standard for any "the game just ended" card).
- Correct-answer glow (new, pairs with `--success-glow` from 2.1): `shadow-[0_0_24px_hsl(var(--success-glow))]`, applied only during the pop-in animation described in Part 5, removed after the animation completes so it does not linger as a static style.

---

## Part 3: Component anatomy specs

Every recipe below is buildable with existing Tailwind utilities plus the token additions in Part 2. None require a new npm dependency.

### 3.1 `<GameShell>` (new shared component, wraps every game page)

Replaces the copy-pasted `<main className="min-h-screen bg-background"><GameNavbar />...` boilerplate at the top of every page.

```tsx
<main className="min-h-screen bg-background">
  <GameNavbar />
  <div className={cn("mx-auto px-4 py-6 md:py-10", width === "wide" ? "max-w-4xl" : "max-w-2xl")}>
    {children}
  </div>
</main>
```

Two width variants only: `narrow` (`max-w-2xl`, the HigherLowerTransfers width, for any 1-2 column comparison/card game) and `wide` (`max-w-4xl`, a size between Footle's current `max-w-7xl` and the narrow variant, chosen because Footle's actual content, a search bar and a guess board, does not need full `max-w-7xl` on desktop, that width was inherited from an older layout and reads as excessive whitespace on large screens). Every future page picks one of exactly two values, killing Problem 1.

### 3.2 Game page header (standard `<h1>` block)

```tsx
<header className="text-center mb-6 md:mb-8 relative">
  <button
    onClick={() => setShowRules(true)}
    className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-surface-2"
    aria-label="How to play"
  >
    <HelpCircle className="w-5 h-5 md:w-6 md:h-6" />
  </button>
  <h1 className="text-4xl md:text-6xl font-display font-bold tracking-[0.15em] uppercase text-primary mb-2">
    {gameName}
  </h1>
  <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
    {oneLine GoalStatement}
  </p>
</header>
```

The one-line goal statement directly under the title is the fix for backlog item #23 ("Rules on game entry"): every game gets a single sentence stating the objective before any modal is even opened, the modal exists for the full ruleset, not as the only place the goal is stated.

### 3.3 Stat / clue tile

The shared primitive behind Footle's guess-board cells, HigherLowerTransfers's player cards, and any future attribute-tile game (the Who Are Ya-style pattern flagged as high-value in R1).

```tsx
<div className={cn(
  "rounded-xl border p-4 text-center flex flex-col items-center gap-1 transition-all duration-200",
  state === "correct" && "bg-correct/15 border-correct text-correct-foreground",
  state === "close" && "bg-close/15 border-close",
  state === "incorrect" && "bg-surface-2 border-border text-muted-foreground",
  state === "pending" && "bg-surface-1 border-border/60",
)}>
  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
  <span className="text-base font-bold font-display">{value}</span>
  {direction && (
    <span className="text-xs">{direction === "up" ? "▲" : "▼"}</span>
  )}
</div>
```

`state` drives both color and the reveal animation class (Part 5). This single component replaces bespoke markup in every clue-reveal, grid, and attribute-comparison game (Footle, Stat Detective, Career Ladder, Career Quiz, the future attribute-tile Footle upgrade recommended in R1 item 10).

### 3.4 Guess input + suggestion list

Formalizes the existing `PlayerSearch`/shared `PlayerAutocomplete` pattern (already built per the completed backlog item #29) into one visual spec every game should match:

```tsx
<div className="relative">
  <input
    className="w-full px-4 py-3 rounded-xl border border-border bg-surface-1 text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] focus:ring-primary/40 focus:border-primary/50 transition-all"
    placeholder="Type a player's name..."
  />
  {suggestions.length > 0 && (
    <ul className="absolute z-20 mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl border border-border bg-surface-2 shadow-lg divide-y divide-border/50">
      {suggestions.map(s => (
        <li key={s.id} className="px-4 py-3 min-h-[44px] flex items-center gap-2 cursor-pointer hover:bg-surface-3 active:bg-surface-3">
          <span className="text-lg">{flagEmoji(s.nationality)}</span>
          <span className="font-medium">{highlightMatch(s.name, query)}</span>
          <span className="ml-auto text-xs text-muted-foreground">{s.club}</span>
        </li>
      ))}
    </ul>
  )}
</div>
```

`min-h-[44px]` on each suggestion row satisfies the mobile tap-target rule in Part 6. `highlightMatch` bolds the matched substring, directly addressing backlog item #31 (suggestion text not matching typed letters) as a visual, not just logic, fix.

### 3.5 On-screen feedback (correct / wrong / partial)

Three states, each a short, self-contained animation plus a static resting style (see Part 5 for keyframes):

- **Correct**: tile background transitions to `bg-correct`, a one-shot `pop` scale animation (`scale(1) -> scale(1.08) -> scale(1)`, 320ms), plus the `--success-glow` box-shadow for the duration of the animation only.
- **Wrong / invalid submit**: the whole input or card gets a `shake` animation (horizontal jitter, 300ms, 3 cycles), border flashes to `border-destructive` for the animation duration then returns to `border-border`.
- **Partial / close**: tile background transitions to `bg-close`, no shake, a gentler `pop` at 80% of the correct-state scale delta so partial matches read as "notable" without competing with a full correct.

### 3.6 Result screen anatomy

The shared `<ResultScreen>` slot structure that replaces both Footle's and HigherLowerTransfers's hand-built game-over cards (fixes Problem 2):

```tsx
<div className="bg-surface-1 border border-border rounded-2xl p-5 md:p-6 max-w-md w-full mx-auto text-center shadow-xl animate-in fade-in zoom-in-95 duration-300">
  {/* 1. Emoji / icon, tuned per outcome tier */}
  <div className="text-5xl mb-3">{outcomeEmoji}</div>

  {/* 2. Headline */}
  <h2 className={cn("text-2xl font-display font-bold mb-1", won ? "text-correct" : "text-destructive")}>
    {headline}
  </h2>

  {/* 3. Stat line (score, streak, guesses used) */}
  <p className="text-foreground text-sm md:text-base mb-1">{statLine}</p>

  {/* 4. Optional fun fact / context line */}
  {funFact && <p className="text-muted-foreground text-sm mt-1 mb-3">{funFact}</p>}

  {/* 5. Emoji-grid block, ALWAYS rendered (even a 1-line grid), styled not raw <pre> */}
  <div className="my-4 py-3 px-4 rounded-xl bg-surface-2 border border-border/60 font-mono text-lg leading-relaxed tracking-widest">
    {emojiGrid}
  </div>

  {/* 6. Share row */}
  <ShareButtons ... />

  {/* 7. Play-next / replay CTA */}
  <button className="mt-5 inline-flex items-center gap-2 px-8 py-3 min-h-[44px] bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity">
    {ctaLabel}
  </button>
</div>
```

The mandatory emoji-grid slot (item 5) is the direct fix for Problem 6 and backlog items #26/#115: every game must produce at least a one-line grid (even a game like Footle that currently sends none), because the styled block, not a raw `<pre>`, is what makes the result screen screenshot-worthy per Part 6's vertical-screenshot rules.

### 3.7 How-to-Play popover (generalized)

Refactor `HowToPlay.tsx` from Footle-hardcoded content into a content-driven shared component:

```tsx
interface HowToPlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameName: string;
  goal: string;               // one sentence, mirrors the header's goal line
  colorGuide?: { swatch: 'correct'|'close'|'incorrect'; label: string; description: string }[];
  rules: string[];             // plain-language bullet list, replaces the free-form <section> blocks
  difficultyModes?: { name: string; description: string }[];
}
```

Rendered inside the existing `<Dialog>`/`<DialogContent>` shadcn wrapper unchanged (it already ships correct `animate-in`/`zoom-in-95` behavior per `dialog.tsx`), only the body content becomes prop-driven instead of hardcoded. This single change unblocks backlog items #23 (rules on entry, every game) and #107 (plain-language rewrite, every game) from needing 65 separate component forks.

### 3.8 Header with daily score placeholder

Extends the existing `GameNavbar` rather than replacing it (it already computes real stats via `useGameNavbarStats`). Add one new slot for the cross-game daily score called out as the single biggest opportunity in R1's competitive research (backlog item #16):

```tsx
<div className="flex items-center gap-1 text-xs sm:text-sm">
  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
  <span className="text-muted-foreground">
    <span className="hidden sm:inline">Today: </span>
    <span className="font-medium text-foreground">{dailyScoreTotal ?? '-'}</span>
  </span>
</div>
```

Placed between the existing "Points Today" and "Streak" slots. Uses the new `text-gold` token (Part 2) instead of the navbar's current raw `text-yellow-500`/`text-orange-500` Tailwind defaults, so this is also the moment those two literals get migrated to tokens.

### 3.9 Game cards on home

Refines `Index.tsx`'s existing `GameCard` function (keep its structure, tighten its tokens):

```tsx
<Link className="group flex items-start gap-3 rounded-xl border border-border bg-surface-1 p-4 hover:border-primary/40 hover:bg-surface-2 hover:-translate-y-0.5 transition-all duration-200">
  <span className="text-2xl shrink-0 mt-0.5">{game.emoji}</span>
  <div className="min-w-0 flex-1">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-display font-bold text-foreground group-hover:text-primary transition-colors">{game.label}</span>
      {game.daily && <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">Daily</span>}
      {game.isNew && <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold/15 text-gold"><Sparkles className="w-3 h-3" />New</span>}
    </div>
    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{game.description}</p>
    {bestScore != null && bestScore > 0 && <span className="text-[10px] text-gold/70 mt-0.5 block">PB: {bestScore}</span>}
  </div>
</Link>
```

Only three changes from the current implementation: `bg-card` to `bg-surface-1`/`bg-surface-2` (uses the new elevation ladder), the inline `hsl(43,85%,55%)` literals replaced with `text-gold`/`bg-gold/15` (Problem 8 fix), and a subtle `hover:-translate-y-0.5` lift added (a cheap, well-established "this is clickable" affordance not currently present).

---

## Part 4: Animation guide

Every animation below is a pure CSS keyframe compatible with the existing `tailwindcss-animate` plugin and the one custom keyframe already in `index.css` (`cell-reveal`). No Framer Motion, no GSAP, no new dependency.

### 4.1 Additions to `src/index.css`

```css
@layer utilities {
  /* existing cell-reveal kept unchanged above this line */

  @keyframes tile-flip {
    0%   { transform: rotateX(0deg); }
    50%  { transform: rotateX(90deg); }
    100% { transform: rotateX(0deg); }
  }
  .animate-tile-flip {
    animation: tile-flip 0.5s ease-in-out forwards;
  }

  @keyframes pop-correct {
    0%   { transform: scale(1); }
    45%  { transform: scale(1.08); }
    100% { transform: scale(1); }
  }
  .animate-pop-correct {
    animation: pop-correct 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  @keyframes shake-wrong {
    0%, 100% { transform: translateX(0); }
    20%      { transform: translateX(-6px); }
    40%      { transform: translateX(6px); }
    60%      { transform: translateX(-4px); }
    80%      { transform: translateX(4px); }
  }
  .animate-shake-wrong {
    animation: shake-wrong 0.3s ease-in-out;
  }

  @keyframes count-up-fade {
    0%   { opacity: 0; transform: translateY(4px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .animate-count-up-fade {
    animation: count-up-fade 0.4s ease-out forwards;
  }
}

@media (prefers-reduced-motion: reduce) {
  .animate-tile-flip,
  .animate-pop-correct,
  .animate-shake-wrong,
  .animate-count-up-fade,
  .animate-cell-reveal {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

### 4.2 What animates, and why

| Interaction | Animation | Duration | Easing | Notes |
|---|---|---|---|---|
| Tile reveals its color after a guess (Footle board, any attribute-tile game) | `tile-flip` | 500ms per tile, staggered 80ms apart across a row | `ease-in-out` | Mirrors Wordle's canonical letter-by-letter flip. Stagger via inline `animation-delay` per tile index, not a new keyframe. |
| Guess is fully correct | `pop-correct` + `shadow-[0_0_24px_hsl(var(--success-glow))]` for the animation's duration | 320ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` (a slight overshoot, "bouncy" without looking silly) | Apply to the single tile/card that resolved correct, not the whole board. |
| Guess is close/partial | `pop-correct` at `scale(1.04)` instead of `1.08` (override via a `close` variant class or an inline style multiplier) | 280ms | same curve | Deliberately smaller than the full-correct pop so players learn to read intensity as a signal. |
| Invalid or wrong submission | `shake-wrong` | 300ms | `ease-in-out` | Apply to the input field or the comparison card, remove the animation class after `animationend` so a second wrong guess in a row can replay it (React: toggle a `key` or a boolean state flag). |
| Result screen appears | shadcn's built-in `animate-in fade-in zoom-in-95` (already available via `tailwindcss-animate`, see `dialog.tsx` for the exact utility names already proven in this codebase) | 300ms (Tailwind's `duration-300`) | Tailwind default (`ease` cubic-bezier) | No new keyframe needed, reuse the same utility classes already powering every shadcn Dialog. |
| Stat tiles / numbers counting in on a result screen | `count-up-fade`, staggered 60ms per tile | 400ms | `ease-out` | Cheap "things are settling into place" feeling without a real JS count-up library. |
| How-to-Play modal open/close | Already handled by `dialog.tsx`'s existing `data-[state=open]:animate-in ... zoom-in-95 ... slide-in-from-top-[48%]` | 200ms (`duration-200` on `DialogContent`) | Tailwind default | Zero changes needed, this is already correct. |
| Hover on a game card / clickable row | `hover:-translate-y-0.5 transition-all duration-200` | 200ms | Tailwind default `ease` | See 3.9, a cheap, standard affordance currently missing from `GameCard`. |
| Streak flame / daily badge idle state | None (explicitly do not animate resting UI) | - | - | Competitor research found no major competitor animates persistent header chrome; reserve motion for event-driven feedback only, matching Wordle/Connections/Poeltl convention of static headers. |

### 4.3 Sequencing rule for result reveals

To match the "withheld reveal drives engagement" finding from prior research (R3 Part 3) and Instagram's own quiz-sticker guidance: never show the final score/emoji-grid block before the last round's tile-flip animation completes. Gate the `<ResultScreen>` mount behind a `setTimeout` matching the last tile's flip duration plus its stagger delay (already the pattern HigherLowerTransfers uses with its 1400ms reveal-then-advance `setTimeout`, generalize that exact technique rather than inventing a new one).

---

## Part 5: Mobile rules

### 5.1 Breakpoints

Keep Tailwind's default breakpoint scale (already in use, no config change needed): `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1400px` (custom container max per `tailwind.config.ts`'s `container.screens['2xl']`). The only rule to formalize: **every game page's primary layout decision (1-column vs multi-column, `text-4xl` vs `md:text-6xl`) happens at the `md:` breakpoint, not `sm:` or `lg:`.** This matches what both audited pages already do (`text-5xl md:text-7xl`, `py-6 md:py-10`) and should be the single breakpoint every new component reasons about, with `sm:` reserved only for small typographic/icon-size nudges (as `GameNavbar` already does correctly with `w-3.5 h-3.5 sm:w-4 sm:h-4`).

### 5.2 Tap targets

Every interactive element must be at least 44x44px per the iOS Human Interface Guidelines minimum (also the de facto sitewide standard already, `ShareButtons`'s own `btnBase` class literally documents `w-11 h-11 min-w-[44px] min-h-[44px]`, generalize that exact value everywhere instead of just the share row):

- Buttons: minimum `min-h-[44px]`, horizontal padding sufficient that width also clears 44px for icon-only buttons (`p-2.5` minimum for a 24px icon).
- Suggestion-list rows (3.4): `min-h-[44px]` per row, already specified above.
- Difficulty pills, mode toggles: current Footle implementation (`px-5 py-1.5`, `px-6 py-2`) is borderline on vertical height at the smaller size, bump the toggle's vertical padding to `py-2` minimum sitewide to guarantee 44px with default text-sm line-height.
- Close ("X") buttons on dialogs: shadcn's default `DialogPrimitive.Close` is a small icon-only hit target (`h-4 w-4` icon in unspecified padding), verify or pad to 44px when instantiating game-specific dialogs.

### 5.3 Vertical-screenshot-friendly result screens (TikTok legibility)

This is the least-built-out area of the current site (Problem 6, Problem 9 in the executive summary) and the highest-leverage addition per prior research's virality findings (R3 Part 3: percent-based bragging rights and compressed emoji grids are what get pasted into group chats and posted to Stories).

Rules for the `<ResultScreen>` component (3.6) and its underlying `<ShareCard>` (the `html2canvas`-exported asset):

1. **Design the exported card at a 9:16-safe aspect internally, even though the on-page result card itself stays a normal square-ish card.** `ShareCard.tsx` currently hardcodes `width: 540` with no fixed height, meaning very long content pushes the card taller than a phone screen can screenshot in one frame. Add a `minHeight` guard and cap `emojiGrid` display to a maximum of 6 visual rows so the exported PNG never exceeds roughly a 540x960 (9:16) safe frame.
2. **Increase the exported card's base font sizes for the score/result line specifically**, since TikTok/Instagram Stories compress images and re-encode video, small text becomes illegible after a re-share screenshot-of-a-screenshot chain. `ShareCard.tsx`'s current `fontSize: 24` for the score value should move to `fontSize: 32` minimum, and the emoji grid's `fontSize: 30` should stay or increase slightly, do not go smaller.
3. **Always render the site URL as literal, unstyled text near the score**, not just in small muted footer text. `ShareCard.tsx` already does this correctly (`douknowball.com{gamePath}` in the footer row), keep this pattern and do not let any new game skip passing `gamePath`.
4. **Reserve a consistent safe margin (`padding: 40` already used in `ShareCard.tsx`) on every exported card**, since Stories/TikTok UI overlays (captions, stickers, the record button) sit near the edges and top/bottom of a 9:16 frame, a card with tight edge padding gets its corners clipped by platform UI when posted as a full-bleed Story background.
5. **On the in-page (not exported) result screen, cap the card's own width at `max-w-md` (already the Footle/HigherLowerTransfers convention) even on desktop**, so a phone user who screenshots the live page (rather than using Save Image) still gets a portrait-friendly, single-column capture rather than a wide desktop layout with excess whitespace on either side.

### 5.4 Layout rules beyond the two audited pages

- Two-card comparison layouts (HigherLowerTransfers's higher/lower pattern) should stack vertically below `sm:` and go side-by-side at `sm:` and up, currently they are already side-by-side via `flex gap-3` with no explicit breakpoint check, verify this does not compress illegibly at 320px (the narrowest common device width) and add `flex-col sm:flex-row` if it does.
- Any grid-format game (Soccer Grid, Football Grid, College Grid, Connect 4 family) must guarantee its 3x3 or larger grid fits without horizontal scroll at 375px width, this needs a per-game audit (ties directly into the owner's own pending backlog item #21, Mobile layout audit of every game) rather than a single sitewide CSS rule, since cell content density varies by game.

---

## Part 6: Accessibility

### 6.1 Contrast minimums

WCAG 2.2 AA: 4.5:1 for normal text, 3:1 for large text (24px+ regular or 19px+ bold) and for UI component boundaries/icons. Apply against the actual token values already in `index.css`:

- `--foreground` (`210 20% 95%`, near-white) against `--background` (`225 25% 6%`, near-black): passes AA comfortably, this pairing is the site's primary reading contrast and should remain the default for all body copy.
- `--muted-foreground` (`215 15% 50%`, a mid-gray) against `--background`: verify this specific pairing against 4.5:1 before shipping any new component that relies on `text-muted-foreground` for anything more critical than a caption or timestamp. If a new use case needs muted text at a size below `text-sm`, either bump to `text-foreground` or confirm contrast per-case rather than assuming the existing token passes at every size.
- `--primary` (`152 60% 42%`, the brand green) as a text color directly on `--background`: this is the pairing used for every hero title and CTA label sitewide (`text-primary` on titles, `bg-primary text-primary-foreground` on buttons), verify it against 4.5:1 for the title use case (large text, 3:1 minimum applies and should pass easily) and confirm the button-label pairing (`--primary-foreground: 0 0% 100%` white text on the green `--primary` background) clears 4.5:1, which a pure white on a mid-saturation green at 42% lightness is likely to pass but should be spot-checked with a contrast tool before the token spec is considered final.
- New `--gold` token (`43 85% 55%`): this is a light, saturated yellow-gold. When used as `text-gold` directly on `--background`, check contrast carefully, high-lightness yellows are a common contrast failure point. If it fails at body-text sizes, restrict `--gold` to large text (badges, large numerals) and icon fills only, never small body copy, which matches how it is already used in the codebase today (badge chips, PB labels, icons).
- Semantic feedback colors (`--correct`, `--close`, `--incorrect`) each ship a matching `-foreground` pair already, always use the paired foreground token when placing text on these backgrounds rather than assuming `--foreground` works universally across all three.

### 6.2 Focus states

- Every interactive element must have a visible focus indicator distinct from its hover state, per WCAG 2.4.7 and the stricter 2.4.13 (AAA, worth targeting even though AA is the floor). The existing `--ring` token (`152 60% 42%`, same hue as primary) is already correctly wired through shadcn's `focus:ring-2 focus:ring-ring` convention.
- Standardize on the new `--focus-ring-width` token (Part 2, `3px`) for any custom (non-shadcn) interactive element built during this overhaul, e.g. the guess-input spec in 3.4 uses `focus:ring-[3px]` rather than the shadcn default `ring-2` (2px), since WCAG 2.4.13's stricter guidance calls for a minimum 2px perimeter and most competitor implementations render focus rings closer to 3px for genuine visibility against a dark background specifically.
- Never remove focus outlines (`outline-none`) without supplying a replacement ring, `Index.tsx`'s search input already does this correctly (`focus:outline-none focus:ring-2 focus:ring-primary/40`), generalize that exact pairing, never ship a bare `outline-none`.

### 6.3 Reduced motion

- The `@media (prefers-reduced-motion: reduce)` block specified in Part 4.1 must ship alongside every new keyframe added to `index.css`, collapsing all four new animations (`tile-flip`, `pop-correct`, `shake-wrong`, `count-up-fade`) plus the existing `cell-reveal` to a near-instant single frame rather than removing the state change entirely, players with motion sensitivity still need to see that a tile changed color, they just should not see it move.
- Do not rely on `prefers-reduced-motion` alone for the shake-wrong pattern specifically, since a shake is the primary signal for "this was invalid," pair it with a non-motion cue (the border-color flash to `border-destructive` already specified in 3.5) so the meaning survives even at near-zero animation duration.
- html2canvas-based image export (`ShareButtons.handleSaveImage`) is unaffected by `prefers-reduced-motion` since it captures a static DOM snapshot, no changes needed there.

### 6.4 Other accessibility notes

- Color must never be the only signal. Every tile-state spec in 3.3/3.5 already pairs color with a symbol (▲/▼ arrows, checkmarks implied by the `correct` state) or text, continue this discipline for any new attribute-tile game, since red/green colorblindness affects a meaningful share of players and the correct/close/incorrect palette leans on green/gold/neutral rather than green/red specifically, which is already a safer choice than a pure green/red scheme, keep it that way.
- `aria-label`s already exist on icon-only buttons in the audited files (`aria-label="How to play"`, `aria-label="Clear search"`, `aria-label="Go back"`), continue this pattern for every new icon-only control introduced by this spec (the header's new daily-score star icon in 3.8, for example, needs a label since the number beside it may not be sufficient context alone for a screen reader).
- Dialog titles must remain real `<DialogTitle>` elements (not styled `<div>`s) for every generalized How-to-Play instance (3.7), since Radix's Dialog primitive wires `aria-labelledby` to whatever element carries `DialogTitle`, breaking that contract by swapping in a plain div silently removes the accessible name from the dialog.

---

## Part 7: Migration plan

Ordered so that shared primitives exist before any page adoption, and so the highest-traffic, highest-risk pages (home, Footle as the modal-heavy exemplar) are proven early rather than last. Sizes are S (under a day), M (a focused day or two), L (multi-day, needs its own pass).

### Phase 1: Foundation (build once, ship to no visible pages yet)

1. **[S] Token additions to `src/index.css` and `tailwind.config.ts`** (Part 2.1/2.2): add `--gold`, `--surface-1/2/3`, `--warn`, `--success-glow`, `--focus-ring-width` plus their Tailwind color mappings. Zero visual change on its own since nothing consumes the new tokens yet, this is purely additive and safe to ship first.
2. **[S] Animation keyframes added to `src/index.css`** (Part 4.1): `tile-flip`, `pop-correct`, `shake-wrong`, `count-up-fade`, plus the `prefers-reduced-motion` block. Also additive and inert until a component applies the classes.
3. **[M] Build `<GameShell>`** (Part 3.1) as a new shared component in `src/components/game/`. Because every existing page already follows the `<main><GameNavbar />...<Footer /></main>` shape almost exactly, this is a mechanical extraction, not new design work, but touching 65 call sites eventually means the component's API needs to be right on the first try, hence M not S.
4. **[M] Build `<ResultScreen>`** (Part 3.6) as a new shared component with the seven-slot anatomy specified. This is the component with the most net-new layout decisions (the always-render emoji-grid rule, the staggered reveal timing) so budget a full focused session even though the JSX itself is not large.
5. **[S] Build `<StatTile>`** (Part 3.3) as a new shared component. Small in isolation, but write it expecting immediate reuse in Phase 2's Footle re-skin, so validate it against Footle's actual `GameBoard` cell shape before considering it done.
6. **[S] Generalize `HowToPlay.tsx` into a content-driven `<HowToPlay>`** (Part 3.7). Keep the existing Footle content as the first caller's props rather than deleting anything, this is a signature change plus a content-extraction, not new dialog logic (the dialog behavior itself is already correct per `dialog.tsx`).

### Phase 2: Prove the shell on a small, representative set

7. **[M] Re-skin Footle to consume `<GameShell>`, `<StatTile>`, `<ResultScreen>`, and the generalized `<HowToPlay>`.** Footle is deliberately the first real page because it is the most complex audited page (modal, mode toggle, difficulty pills, board, legend, PostGameStats integration), if the shared components survive Footle intact, they will survive simpler pages without rework. Verify the tile-flip animation (4.2) against `GameBoard`'s actual cell rendering, this is the first real exercise of that keyframe.
8. **[S] Re-skin HigherLowerTransfers to consume the same shared components**, specifically validating that `<ResultScreen>` handles a streak-based game (no fixed "won/lost" binary, no `targetPlayer` reveal) as gracefully as it handles Footle's guess-count-based outcome. This page is the fast follow because it is structurally simpler and will surface any place the Phase 1 components over-fit to Footle's shape.
9. **[S] Apply the `<GameCard>` token refresh** (Part 3.9) to `Index.tsx`'s home page card grid. Low risk (three token swaps plus one hover affordance), high visibility (every visitor sees the home page first), good early proof point to show the owner before committing to the full 65-game rollout.

### Phase 3: Sitewide rollout (informed by Phase 2 learnings)

10. **[L] Roll `<GameShell>` + `<ResultScreen>` + `<StatTile>` out across the remaining ~62 game pages**, grouped by structural similarity rather than alphabetically: clue-reveal games (Career Ladder, Career Quiz, Stat Detective, Who Am I) first since they share `<StatTile>`'s exact shape, then grid/board games (Soccer Grid, Football Grid, College Grid, the Connect-4 family), then lineup-builder games (World XI, Build Your XI, Perfect Lineup family), then everything else. This grouping lets one migration session validate the shared components against one mechanic family at a time instead of context-switching every page.
11. **[M] Migrate every remaining inline gold/orange/yellow literal to the new `text-gold`/`bg-gold`/`text-warn` tokens** (Problem 8) as a dedicated pass once Phase 3's page-by-page migration surfaces the full list of call sites (`GameNavbar`'s `text-yellow-500`/`text-orange-500`, any per-game literal not caught during the page-by-page pass).
12. **[M] Wire every result screen to always populate `emojiGrid`** (fixing Problem 6 sitewide, directly closing backlog items #26 and #115) as part of each page's `<ResultScreen>` adoption in step 10 rather than as a separate pass, since the two changes touch the same code.
13. **[L] Apply the vertical-screenshot rules from Part 5.3 to `ShareCard.tsx`** (the height cap, the increased score font size, the safe-margin verification) as a single focused update to that one file, since it is shared infrastructure consumed by every game's `<ResultButtons>` call, fixing it once benefits all 65 games simultaneously rather than needing a per-page change.

This ordering means the owner sees visible, shippable progress after Phase 2 (two re-skinned pages plus a refreshed home page) before committing to the larger Phase 3 effort, and every shared component is battle-tested against the most complex existing page (Footle) before being trusted across the remaining catalog.
