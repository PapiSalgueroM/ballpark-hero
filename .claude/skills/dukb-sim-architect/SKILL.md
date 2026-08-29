---
name: dukb-sim-architect
description: Use when designing or deepening a simulation (Club Manager, Soccer Career, front offices, dynasties, Rebuild, tycoons) or a match/competition engine. Encodes how simulations are built here so they stay deterministic, honest and balanced.
---

# DoUKnowBall Simulation Architect

A simulation is a promise that its world is internally consistent. The engine
decides everything; prose only describes it.

## The four load-bearing rules

1. DETERMINISTIC ENGINES DECIDE. Who won, the score, the stat line, the transfer
   fee: engine output, never an AI's improvisation. AI may phrase the headline
   AFTER the engine wrote the fact (the Round 292 Ballon d'Or rule: every honour
   read off one reconciled record through one function).
2. VALIDATORS FAIL CLOSED. Anything that cannot verify returns
   {valid:false, unverified:true, reason:"...try again"} and the client treats it
   as a no-penalty retry. Never accept-on-error. simValidatorsFailClosed scans all
   edge functions for the banned shape; the July P1 is why.
3. ERA SNAPSHOTS ARE SEALED. A historical save carries its own rosters, league
   membership, competition rules and ratings; the live database must never bleed
   into it, and era rules differ by season (the 4-groups-vs-8 lesson; competition
   formats are data by season, never hard-coded).
4. NO INVENTED FACTS ON REAL PEOPLE. Generated narrative (inbox, press, dressing
   room) must never put words or deeds on a real person. Attribute to roles, or
   use generated characters. simNoInventedQuotes fences it.

## Balance is measured, never felt

The repo's balance bugs were all found by harnesses that simulate hundreds to
thousands of seasons and compare distributions against a baseline. When tuning:
- Run the engine's own loop at scale (300 careers to 1400 ceremonies, 2400 seasons
  an arm) and read distributions, not anecdotes.
- Margins come from MEASURED headroom over repeated runs, never a number that felt
  right. Round 284's coin-toss threshold and simOpposition's rederived 2.0 line
  are the worked examples; read simOpposition.mjs's header before setting any
  tolerance.
- Never assert on a max, never assert non-significance, and print counts so a
  harness cannot pass empty.
- Known regression shapes that must never return: a strength multiplier that
  cannot reach 1; growth ignoring potential headroom; parsing playoff depth out
  of a result string; hooks after a conditional return (React error 310).

## Structure that has survived

One engine file in src/lib (pure functions over state), a hook in src/hooks, a
page in src/pages; saves in localStorage under a versioned key with migration on
load, old payload shapes deliberately readable or deliberately reset with the
reason documented (the Round 301 {date, slugs} decision). The two-arm harness
pattern for engine changes: bundle the real engine, patch the BUNDLE not the
source to build the neutralised arm, assert the patch found its target exactly
once. New sims join runAllSims by the sim* name; a test* name is silently
skipped, which is how a fairness harness went unnoticed.
