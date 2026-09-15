# Guide correction release checks, 2026-09-15

## Scope and status

This release corrects existing NFL, NBA, Champions League, MLB and NHL format
guides, plus three homepage or Soccer Career claims about browser saves and
Record Books. It makes the five guide tables usable on narrow screens. It does
not add articles, change simulation results or submit another AdSense review.

App source is `efe74fc8`, `b05c10a9` and `774b6dd0`. Commit `253790d7` adds the
five guide snapshots, Soccer Career snapshot, sitemap and lastmod ledger;
`a35693a5` updates the MLB snapshot and ledger after the final source-note fix.
It is based on main `9f828738`. The correction is not yet confirmed published.

The factual evidence is recorded in [the NFL research record](nfl-guide-correction-2026-09-15.md)
and [the four other guide corrections](other-guide-corrections-2026-09-15.md).
The NFL guide was rechecked broadly. The other four received targeted corrections;
their original full-guide verification dates were retained.

## Completed local checks

- The real app type check passed. The six-route SEO build completed with zero
  failed pages. A final production build after the table change also passed.
- All 21 final focused harnesses passed: the 15 required built-document fences,
  `simHomeCopy` and all five format-guide harnesses. These include the actual
  saved HTML, metadata, internal links, robots rules, sitemap, consent/ad gates,
  brand checks, stable snapshot assets and successful browser boot.
- The final NFL snapshot negative control restored the old 1990 bye claim in
  memory and was caught by the exact saved-claim assertion. All 19 NFL source
  controls and 13 controls for the other guides also passed their intended
  failure checks. Controls did not modify production files.
- A browser sweep used the real final production JS and CSS from `a35693a5`,
  with external requests blocked. All five guides passed at 320, 390, 430 and
  1440 pixels: 20 cases, correct affected cells or FAQ, visible sources, one
  main heading, no runtime or asset errors and zero page overflow.
- On the three phone widths, the table region took keyboard focus and scrolled
  horizontally with the arrow key. The swipe hint was visible. The smallest
  measured explanation column was 279.95 pixels. The page itself stayed fixed
  horizontally. The 320-pixel NFL, MLB and Champions League screenshots were
  opened and inspected after the change.
- Raw homepage copy and the actual guest Soccer Career screen passed at 320,
  390 and 1440 pixels. The account copy now matches localStorage career saves
  and optional account score profiles.

An earlier local `simPrerenderBoot` attempt hit two 25-second navigation
timeouts. An unchanged-artifact retry passed, and the complete final fence run
also passed all sampled boots and eleven retired-route redirects. This was a
non-reproducing local timing failure, not a code fix or an omitted check.

Local evidence is under
`C:/Users/antho/.codex/visualizations/2026/09/15/01a0a304-8aa4-7612-a558-91eac041eec2/guide-correction-readable/`
(`verification.json` and 20 screenshots). Final harness logs are in
`C:/Users/antho/AppData/Local/Temp/dukb-guide-final-provenance-fences/`.

The final independent review caught an outdated MLB note saying blocked
articles were uncited even though one had since been read and cited. The note
now records the actual September 15 recheck. Its snapshot was regenerated.
All 21 fences and 20 browser cases were repeated on the final build, including
a check that the obsolete blanket claim is absent from the real MLB page.

## Narrow release decision and complete output checks

At 15:56 EDT the correction passed all 31 applicable checks recorded in
[the output evidence](guide-correction-output-checks-2026-09-15.json). An
independent AST inventory covered all 369 discovered harnesses and 56 helper
or test files. This is the complete current generated-output sim reader set,
plus the home-copy and fallback-404 checks, rather than only the older 15-name
list in AGENTS.md.

The added checks passed for dependency weight, account claims, hub depth,
redirect links, record books, grid archives, login return, FAQ schema and draw
order. The archive verified 4,032 answers in 504 cells across four sports
against the current public game data. The FAQ check covered 154 documents and
ten runtime head states. The draw-order check covered the six changed routes
plus home, with three takes at each offset: no changing head or readable blocks.
The fallback check blocked app JavaScript and confirmed both dead addresses
are marked correctly while home and seven real routes remain unaffected.

This narrow publication uses AGENTS.md's between-big-ships verification path.
The diff changes guide facts, citations, table layout and three copy claims,
with dedicated guards and derived documents. It changes no engine rules, RNG,
saves, hooks, dependencies, routes or ad/consent behavior. The shared UCL
reference module retains all engine-consumed format values and functions;
its added citation and optional table exception are presentation data only.

This decision replaces the earlier self-imposed full-simulation/artifact hold
for this content correction. The complete local build and affected-output
evidence establish its release basis. The larger game releases retain their
full simulation, browser and exact-artifact gates. No pending CI result is
being counted as a pass, and no pending artifact is being accepted.

## Additional full verification

[Run 35013330789](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/35013330789)
uses verification commit `a5863797`, with the final corrected app inputs and
table styles. Full verification and success-only artifact packaging remain
pending. It supersedes run `35011097191`, which was cancelled after the
independent review caught the stale MLB source note. That prior run passed
types, the six-route build, five default guide guards and all 33 controls;
it is not final-source release approval. The workflow rejects missing, skipped, duplicate or failed harness
results. Its workflow file belongs only to the verification branch.

This run continues as additional regression coverage. After main lands,
Lovable must publish the matching commit, and public HTTP
checks must confirm the corrected claims and current app assets. A main push
alone does not update the published site.

## AdSense status

The last fully loaded account read was 12:37 EDT: Getting ready and Review
requested, following the 04:19 EDT submission. Later browser connection
timeouts did not establish a newer status. There has been no second request.
Google decides approval. None of the local guards, source corrections or
148-document HTTP audit establishes indexing or approval, or identifies which
pages caused the previous low-value-content rejection.
