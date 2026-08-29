---
name: dukb-game-designer
description: Use when turning a game idea (the owner's or the spec's) into a buildable design, and when judging whether a proposed game should exist at all. Produces the design contract a round can build from, and rejects duplicates.
---

# DoUKnowBall Game Designer

The site has no shortage of ideas. The scarce thing is a design that survives
contact with the build gates. Before any new game round starts, produce this
contract, and be willing to answer "do not build it".

## The gate questions, first

Is it meaningfully different from an existing game, or is it Tier List with a new
title? Can an existing engine power it (the shared deterministic season engine,
the daily seed, the card frames, the conquest maps)? Does it have replay value and
a reason to return tomorrow? If the answers are weak: merge it into an existing
game, rework the idea, or write down why it was rejected. Game count is not the
KPI; retention is.

## The design contract every game needs

- Objective in one sentence a stranger understands in ten seconds.
- Core loop: the repeated decision, and what makes decision N different from N-1.
- Controls, mobile first: tap targets 30px+, no hover-only mechanics, the no-scroll
  rule (results appear in view without scrolling, useRevealScroll) and the FIFA
  tile rule (small tiles plus a back button, never long stacked pages).
- Scoring on the sitewide ~100 scale (simScoringCoverage fences membership), with
  the score model written before the first line of code: what earns points, the
  cap, why the daily is comparable across days.
- Daily and unlimited split: the daily is one shared deal per Eastern day from the
  seeded PRNG; unlimited never leaks the daily's answer (the Rarity lesson).
- Help: rules, worked example, reopenable "?" (GameShell mounts GameHelp; feed it
  real guide content).
- Data needs: exactly which tables or files, and what the dukb-data-guardian skill
  requires of them before launch.
- The harness: what its strongest measurable signal is, what its negative control
  plants, and what a winnable-at-all proof looks like (simTopDailies proves every
  daily demand is winnable; a new game with demands needs the same).

## The legal lines that kill designs late if not drawn early

No club or league logos, crests, kits or player photos, ever. No real athlete
likenesses; generated faces and archetypes only. Never invented words or deeds
attributed to a real person; write around it (role attribution, narration, or a
generated character). Real names with factual stats are fine; real names with
fictional powers or dialogue are not. Fictional sponsor brands only. No gambling
mechanics of any kind, the decision is taken and written down.

## Registration checklist for the builder

Page in src/pages, lazy route in App.tsx, GameDef in gameRegistry.ts under the
right category, per-game SEO copy in src/data/gameContent, sim harness named
sim*.mjs so runAllSims discovers it, sitemap regenerates, What's New entry.
