# Round1062: MMA Fight Promoter

Anthony wants to run a fictional fight organization and choose its fights. Extend
the existing Fight Promoter route with MMA and Boxing choices. MMA is a separate
saved world; old boxing saves and its engine remain intact. No approval question
is needed under Anthony's standing full-autonomy instruction.

## Objective and loop

Build a promotion across12 events: sign or renew original fighters, select a venue
and ticket price, book up to three bouts, run the card, then use actual results,
cash, recovery, rankings and belts to choose the next card. A month off heals
fighters but costs overhead. Finish on a0 to100 legacy score after12 events.

## State and engine contract

Pure deterministic engine in src/lib/mmaPromotion.ts, version1 save under its own
key. Three divisions light/middle/heavy,24 generated fighters, four contracted
fighters per division initially, three fight contracts. Every fighter has stable
id/name/division/style, striking/grappling/cardio, fanbase, wins/losses,
rankingPoints, recoveryUntil, contract, purse, signingBonus. All names and records
are fictional. State holds seed/tick, month/event, cash/reputation, fighters,
champions per division, bounded event history and closed flag.

An event plan has venueId, ticketPrice and up to3 {aId,bId,title} bouts. Engine
rejects self/duplicate/cross-division/uncontracted/unrecovered fighters, invalid
venues/prices and unaffordable guarantees. Title requires both top4 and, for an
occupied belt, the champion participating. Regular bouts3 rounds, title bouts5.
Finishes are KO/TKO, Submission or Decision, based on generated attributes and
seeded per-round output. Preserve winner id, method, round, quality for every bout.
Each result applies exactly once, updates records/ranks, decrements contracts,
sets recovery, awards a booked title to the winner, and reconciles gate, purses,
rent, profit and reputation. Show an expired champion's belt as vacant. A resting
month charges overhead and advances recovery without altering fight records.

API: newMmaPromotion(name, seedLabel?), ratingOfMma(f), mmaRankings(state,division),
legalMmaBout(state,bout): string|null, validateMmaPlan(state,plan): string|null,
projectMmaEvent(state,plan), signMmaFighter(state,id): state|null,
runMmaEvent(state,plan): {state,result}|null, advanceMmaMonth(state): state,
mmaPromotionScore(state): number, loadMmaPromotion(unknown): state|null.
Export DIVISIONS and MMA_VENUES and types MmaFighter, MmaPromotion, MmaPlan,
MmaBooking, MmaBoutResult, MmaEventResult. Values use dollars, not millions.

Hook owns separate storage, current plan, screen/result restore, state ref against
double actions and blocked-storage notice. Start, sign, book, remove, plan edit,
run, rest, back, reset. Never consume/rewrite boxing storage. Unknown/malformed
MMA saves offer a fresh world with a visible explanation, no crash.

## UI and help

Small two-column dashboard tiles: Book card, Fighters, Rankings, Event history.
Back returns to dashboard, no giant stacked page. Roster uses division filter;
booking chooses a pair and title toggle with clear eligibility reasons. Result
has financial receipt and actual bout winners; history opens the saved receipt.
Setup shows rules and one worked example before Start; '?' reopens those rules.
44px actions, visible keyboard focus, dark/light/reduced-motion support and no
automatic page scroll. Keep existing site fonts, plum accents and blue/red
matchup corners as the single distinctive visual device. No photos or logos.

## Score and verification

Score derives from reputation50%, profitable event count30%, filled belts20%,
capped0 to100. This is a long save simulation, no daily answer or daily mode.
Scoped remote workflow only: real app type check, build, engine + mounted
outcomes, effective copied-source controls, seeded strategy distributions,
boxing/gym/career/regression fences, all built-site readers after snapshots,
native journeys across phone/desktop/touch/keyboard/dark/light/reduced motion.
Test deterministic reload, single payout/record application, invalid plans,
contracts/recovery/title transfer, exact receipts, safe saves, focus and geometry.
Controls must alter actual code and fail for the promised outcome. Generated
snapshot and sitemap ledger come only from checked remote artifact.
