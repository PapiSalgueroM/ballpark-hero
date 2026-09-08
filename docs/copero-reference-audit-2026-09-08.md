# Career experience reference and owner review checkpoint

Date: 2026-09-08. Exact owner-selected reference: https://copero.net/en.
Research only. No new cross-sport feature or design is claimed implemented here.

## What the owner wants

Anthony likes Copero's interface and connected website features and wants a better experience across sports, not soccer alone. He also wants to review the whole site when both development lanes reach a stable stopping point. Review should happen before a broad redesign, not after the entire master list. Finish the current bounded batch, expose a stable preview, and clearly separate unfinished requests from completed work.

## Directly observed

The controller inspected the exact site in a browser on desktop and at 390 by 844. A local fictional player named RIVER was created, one academy selected, and the resulting first-season decision, cups and career panels inspected. No account, purchase, public score submission or completed-career sharing was attempted.

The useful pattern is a connected career screen: identity, rating, age, contract, season output and league context remain close to the next decision. Academy offers compare likely playing time. Decision choices expose their risks. The phone version uses compact Decision, Cups and Career tabs instead of one long stacked dashboard. The inspected phone screens had no horizontal overflow. The dark green and lime treatment, strong headings and restrained card hierarchy make the next action easy to find. These are observations of the [career experience](https://copero.net/en), not proof that its simulation is more accurate or deeper.

The creation flow observed here went directly to academy offers after player setup. An eight-attribute draft is advertised, but its manual selection was not demonstrated in this session. Game ratings and generated career results are entertainment values, not verified real-world player facts.

## Public features and limits

| Surface | First-party evidence | Verification limit |
|---|---|---|
| Discovery | [Catalog](https://copero.net/en/games) groups career, daily, quiz and strategy games with short descriptions and session expectations. | Catalog inspected, not every game completed. |
| Career pacing | [Quick Career](https://copero.net/en/games/carrera-rapida) advertises an automated short run. [Daily Career](https://copero.net/en/games/carrera-diaria) advertises a shared UTC-day seed with decisions affecting the outcome. | Separate product contracts, not evidence of our implementation. |
| Community | [Leaderboards](https://copero.net/en/leaderboard) expose player, club and country boards, Today and All-time. [Club pages](https://copero.net/en/clubs/arsenal) expose stories, honours and a locker room. | Loaded board entries, contribution enforcement and dynamic club totals were not tested. |
| Identity | [My Club](https://copero.net/en/my-club) describes a persistent supporter identity, membership number and club honours. [Trophy Room](https://copero.net/en/account) requires Google sign-in to inspect saved content. | Gated depth remains unverified. |
| Save scope | [Privacy policy](https://copero.net/en/privacy) says optional accounts sync completed careers, trophies and achievements, while in-progress drafts and seasons remain browser-local. | Do not describe this as active cross-device career sync. |
| Monetization | [Terms](https://copero.net/terminos) describe recurring Premium, ad removal and earned-medal unlocks. | No numerical price or checkout tested; no account or purchase created. |

## DoUKnowBall already has substantial pieces

Read-only source audit, not a fresh runtime verification of these screens:

- `src/pages/Index.tsx` and `src/pages/SportHub.tsx` already have search, daily/featured shelves and sport grouping. `src/data/gameRegistry.ts` lacks session-length, format and saved-run metadata for a unified discovery filter.
- Soccer Career and four US My Career boards retain identity and career logs inside separate local saves. There is no shared active-career index. Club Manager already has an explicit resume summary and belongs to Claude's lane.
- `src/lib/foHub.ts` powers live-fact management tiles for four Front Offices. Dynasty modes also save progress and show recaps. The site does not connect these through a management or active-franchise shelf.
- `src/components/us-career/TrophyCase.tsx` derives dated honours from season records. Soccer has retirement legacy sharing. `src/components/game/ShareCard.tsx` is built around a short game result, not a full career story.
- `src/pages/Profile.tsx` and `src/pages/Leaderboard.tsx` show scores, ranks, streaks and badges. Profile does not index active athlete saves, seasons or their trophy cabinets. Some score labels still come from a legacy manual map instead of the registry.

These are wiring observations, not a claim that every save, database response or layout works. Existing progress percentages must not be increased because a competing site was researched.

## Recommended order after Anthony's review

1. Better discovery and resume: compact sport/format filters and a Continue Playing shelf with truthful local save summaries. Preserve the mobile first-game fold and guest play. Do not invent duration estimates.
2. Consistent career shell: identity, next decision, team context, history and trophies in short navigable panels across sports. Start with one reviewed example, then adapt the stats and rules per sport. Quick and Daily careers need real designed loops, not renamed long saves.
3. Connected legacy: a local-first career gallery with season history, dated honours and original share cards. Keep long-career legacy separate from ranked daily points. Any cloud sync needs explicit save-version, privacy and conflict design before implementation.

Reuse information hierarchy and interaction ideas, not copied artwork, crests, photos, branding or invented real-person quotes. Keep rival references in internal docs only. None of these proposals authorizes changes to Claude-owned Club Manager files.

## Review checkpoint contract

Codex finishes the geographic English Attack slice, its independent reviews and integration checks. Claude's latest shared branch at this check was `d1c541b3`, with Round 505 landed and 506 to 508 still claimed. That does not prove Claude has stopped or that no unpushed work exists. Confirm his own current checkpoint before saying both lanes are ready.

The handoff must identify the exact preview and commit, checked routes, outstanding findings and larger unfinished work. Local preview, merged code and the published website are separate states. No merge or publish is implied by this checkpoint request.
