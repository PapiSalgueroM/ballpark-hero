# Round 619 design contract: free agents and contract termination

**Status: CONTRACT DRAFTED, NO CODE WRITTEN.**
Raised by the owner on 2026-09-16 through the footer report, routed as a Club Manager feature
request rather than a site issue. His words: add free agents to Manager Mode, and allow players
to have their contracts terminated so they become free agents. His constraint on how it is
built: it belongs in the shared Transfer, Contract and Finance systems, not bolted on as a
one-off screen.

This contract covers the engine half only. The lane split is at the bottom.

---

## 1. What is actually there today, measured before designing

All line numbers are against `src/lib/clubManager.ts` at `origin/main` head `f083e0b2`.

**Free agents exist, but only for AI clubs, and only for a moment.** `fillSquadGaps` (line 14537)
builds a pool on the spot by filtering `marketBase` to a rating band well below the signing
club's own level, hands out at most four players to get a squad back to `SENIOR_FLOOR = 12`,
and discards the pool. Nothing is stored. There is no free agent list in `CareerState`, no
free agent anywhere the human manager can see, and no way for a player to be clubless between
one function call and the next.

**`MarketPlayer` requires a club.** The interface at line 817 has `club: string`, and
`marketBase` (line 6069) derives every entry by walking `projectedWorldFor`, which is a map of
club to roster. A player with no club is therefore not representable in the transfer market's
own type, which is why the pool above has to be conjured and thrown away rather than kept.

**Contracts are real and already have teeth.** `contractYears` (line 461) and `wage` (line 463)
exist, `ensureContracts` (line 4723) repairs both on an old save, `renewalTerms` prices a
renewal, `releaseClause` (line 482) is a promise the manager sold at a renewal, and the Round
105 comment on `contractYears` already says that a deal hitting zero means he walks for nothing.
What is missing is any path by which the manager ends a deal early.

**The transfer window is the gate, and it is a hard one.** Nine functions open with the same
early return on `career.transferWindow === null`: `completeSigning`, `exerciseLoanOption`,
`breakLoan`, `startNegotiation`, `makeOffer`, `offerTerms`, `acceptBid`, `loanOutPlayer` and
`recallLoanedPlayer`. When the window shuts the entire transfer surface goes dark. The separate
`windowWeeksLeft` field (line 1815) is only the deadline day countdown and the weekly decrement
that eventually sets `transferWindow` to null, so it is not the gate and must not be treated as
one.

**The wage bill counts the squad and nothing else.** `wageBill` (line 4620) is a reduce over
`career.squad`. `wageCapFrom` anchors the board's tolerance at that bill plus fifteen percent,
and the finance ledger charges it every calendar week (`src/lib/clubManagerFinances.ts` line 322)
and projects it to the end of the season (line 428).

### The defect this design exists to prevent

Follow those last two facts together. Terminate a player, he leaves `state.squad`, and his wage
leaves `wageBill` in the same tick. The cost of ending a contract is therefore zero, the wage cap
immediately loosens, and termination becomes strictly better than selling him, loaning him out or
playing him. Every save would open by sacking its worst three contracts. That would not be a
feature, it would be a delete button that pays you, and it would quietly destroy the wage cap
constraint that Round 105 built and the squad building the whole mode is about.

**So the load bearing rule of this round is that termination must cost, the cost must persist
after the player is gone, and `wageBill` must still see it.**

---

## 2. State changes

Two new fields on `CareerState`, both optional so every existing save loads, both defaulted by a
new `ensureFreeAgents(state)` that sits beside `ensureContracts` and follows its shape.

```
/** Round 619: men with no club, carried across weeks and seasons. */
freeAgents?: FreeAgent[];
/** Round 619: what ending a contract early still costs, after he has gone. */
severance?: SeveranceRow[];
```

```
export interface FreeAgent {
  name: string;
  position: Position;
  age: number;
  rating: number;
  value?: number;
  generated?: boolean;
  /** Season he became available, so the pool can age and clear. */
  since: number;
  /** How he got here. Drives the copy and the asking wage. */
  reason: 'released' | 'expired' | 'unsigned';
  /** Set only on 'released', and only when I released him. */
  fromMyClub?: true;
}

export interface SeveranceRow {
  name: string;
  /** Thousands per week, same unit as CMPlayer.wage. */
  weekly: number;
  /** Calendar weeks still owed. Counts down with the wage charge. */
  weeksLeft: number;
}
```

`FreeAgent` deliberately does not reuse `MarketPlayer`. `MarketPlayer.club` is required and
means something, and widening it to an empty string would make every existing consumer of the
market silently able to hold a clubless player without any of them being written for it. A
separate type makes the compiler list the places that have to care.

---

## 3. The rules

### 3.1 Termination

`releasePlayer(career, playerId): CareerState | null`.

- Returns null if the player is not in the squad, is on loan in from another club (he is not
  yours to release, use `breakLoan`), or if releasing him would drop the senior count below
  `SENIOR_FLOOR`. You cannot sack your way to an illegal squad.
- **Not gated on the transfer window.** Ending your own contract is not a transfer.
- He leaves `state.squad`, enters `state.freeAgents` with `reason: 'released'` and
  `fromMyClub: true`, and his name joins `goneNames` so the market cannot sell him back to you
  the same season.
- A `SeveranceRow` is written. Weekly is half his wage, rounded up, because a settlement is a
  negotiated discount on the remainder, not a gift. Weeks owed is the weeks left in this season
  plus one full season per remaining contract year beyond the current one, capped at two seasons
  of weeks so a four year deal does not end the save.
- Morale consequence: the dressing room reads it. Squad morale takes a small hit scaled by how
  well regarded he was, which is what stops mass releases being consequence free even once the
  money is right.

### 3.2 The money, and where it is counted

`wageBill` changes from a reduce over the squad to the squad total plus the severance total.
That single change is what makes every downstream number honest at once, because the cap, the
weekly charge and the season projection all already read `wageBill`.

`weeksLeft` decrements in the same weekly step that charges wages, and a row at zero is dropped.
The finance screen gets its own line so the money is visible rather than mysterious: a manager
who has released three players must be able to see why the wage line has not fallen.

### 3.3 Expiry, which already half exists

At the summer rollover, a player whose `contractYears` reaches zero currently walks and is simply
gone. He now lands in `freeAgents` with `reason: 'expired'` and no severance, because nothing was
broken early. This is the change that makes the pool feel like a league rather than a bin for my
own mistakes.

### 3.4 Signing a free agent

`signFreeAgent(career, name, terms): CareerState | null`.

- **Deliberately not gated on `transferWindow`.** This is the one bypass in the round and it is
  the point of it: a free agent is signable out of window in real football. It is a new function
  rather than a weakening of the nine existing guards, so nothing else becomes possible out of
  window by accident.
- Still gated on everything that is not the window: the wage cap, squad size, the pool actually
  containing him, and his own interest.
- Interest is a real check, not a formality. A free agent weighs the club's strength against his
  own rating, the wage offered against what he thinks he is worth, and whether he would play. A
  strong player will refuse a weak club, which is what stops the pool being a free upgrade rack.
- On signing he leaves the pool, joins the squad on the agreed terms, and his arrival is recorded
  as a transfer with a zero fee so the season's business reads correctly.
- **Re-signing a man I released is allowed only after the season he was released in.** Otherwise
  the severance row plus an immediate re-signing is a wage cap exploit: pay half, re-sign at a
  lower wage, count both.

### 3.5 The academy must survive this round

`fillSquadGaps` carries a warning written by whoever last got this wrong: an earlier version that
filled squads to eighteen with good free agents collapsed the measured value of running an academy
from 4.31 rating points to 0.38, and turned neglecting the academy into a strategy. That warning
governs this round.

- The pool is **not** a source of quality. A released or expired player enters it at his real
  rating, but the signable band for any club stays bounded well below what that club would
  normally field, exactly as `fillSquadGaps` already bounds it.
- The pool decays. A free agent unsigned after a season loses rating, and is dropped entirely
  after two, which is both realistic and the thing that stops a slowly accumulating pile of good
  players.
- `fillSquadGaps` stops inventing its own pool and reads `state.freeAgents` first, falling back to
  its current `marketBase` filter only when the pool cannot cover a gap. One pool, one set of
  rules, which is what the owner asked for.
- **`simAcademy` is a gate on this round, not an afterthought.** The measured academy gap must
  still be there afterwards.

### 3.6 The edges the owner listed

| Case | Rule |
|---|---|
| Player voluntarily becomes a free agent | Only by his contract expiring. There is no walk out, because a player unilaterally tearing up a deal is not a thing the manager can be asked to respond to. |
| Club terminates a contract | Section 3.1, with severance. |
| Contract expires naturally | Section 3.3, no severance. |
| No transfer while under contract without a mechanism | Unchanged and enforced. The valid paths stay: an accepted bid, a met release clause, a loan. Termination is a fourth path and it costs. |
| Wage obligations after termination | Section 3.2. This is the round's spine. |
| Transfer window rules | Unchanged for transfers. Termination and free agent signing are the two things that work out of window, and they are separate functions so nothing else leaks. |
| Free agents outside the window | Allowed, section 3.4. |
| Player interest | Real check, section 3.4. |
| AI clubs signing free agents | Through the same pool, section 3.5. |
| Pool changes through the season | Releases and expiries add, signings and retirement remove, decay clears the stale. |
| Historical modes | The pool is per save and per era. `marketBase` is already era aware, and no name may cross eras. |
| Save and load | `ensureFreeAgents`, section 2. Both fields optional, both defaulted, every old save loads unchanged. |
| Retirement and inactive players | Retirement at the rollover removes a man from the pool as well as from squads. A name in `retiredNames` can never be in `freeAgents`. |
| Duplicate free agent records | The pool is keyed by name and deduplicated on every write. A name in the pool, in any squad, in `goneNames` for the current season, or in `retiredNames` cannot be added again. |

---

## 4. How the round is proven

A new `scripts/simFreeAgents.mjs`, plus re-running `simAcademy`, `simContracts`,
`simClubManagerBudget`, `simClubManagerFinances` and `simClubManagerSave`, which are the five
existing harnesses whose subject this round moves.

Sections, each measuring an outcome against a baseline rather than proving absence of a crash:

1. **Termination is not free.** Release the worst contract at a sample of clubs and measure the
   wage bill across the following weeks against a control save that kept him. The bill must not
   fall by his full wage immediately, and the severance must be visible in the projection.
2. **Termination is not dominant.** Over many seasons, a policy of releasing the worst two
   contracts every season must not beat a policy of keeping them, on league finish and on
   finances. This is the check that actually defends the mode.
3. **The window bypass is exactly one door wide.** With `transferWindow` null, `signFreeAgent`
   succeeds and all nine existing gated functions still refuse.
4. **The academy still pays.** The measured gap between running an academy and neglecting it must
   hold against the recorded baseline.
5. **The pool is sane across a long save.** No duplicates, no retired name, no cross era name, no
   unbounded growth, and quality that does not drift upward.
6. **Old saves load.** A save written before this round loads, defaults both fields and plays on.

**Negative controls, one per section, each asserted to fire.** Per the repo rule, a control that
edits a string the file does not contain changes nothing and leaves the harness green for the
wrong reason, so each control asserts its anchor exists before it rewrites it:
`nosev` (drop the severance row on release), `billblind` (make `wageBill` ignore severance),
`openall` (remove the window guard from a transfer function), `goodpool` (let the pool signable
band reach the club's own level), `nodedupe` (allow a duplicate pool write), `nomigrate` (remove
`ensureFreeAgents` from the load path).

Control 2 deserves a note, because it is the one that can pass for the wrong reason. A policy
comparison over few seasons is noise, and asserting that two policies are statistically
indistinguishable is the forbidden shape: it gets easier the less data it is fed. The section
therefore asserts a **direction with a measured margin** over enough seasons to have one, and the
margin comes from measured headroom on healthy code rather than from a number that felt right.

---

## 5. Sequencing, and the file this collides with

Everything above edits `src/lib/clubManager.ts`, which is the same file Rounds 617 and 618 are
sitting on.

The board's 00:46 EDT entry today records that the other lane's combined release landed as
PR 101 and that the integration hold is lifted, so those two are free to move. As of this
contract `r618-gate-estimator` is still not an ancestor of `origin/main`.

**So 619 does not start until 617 and 618 are integrated into main.** Building it first would
force a three way merge in the largest file in the repo across three rounds that all touch the
engine, which is how a round gets lost. The order is 617, then 618, then this.

---

## 6. Lane split

Following the owner's routing table for this request.

**This lane, PC Claude.** The engine and everything under it: the free agent system, termination,
severance and its effect on the wage bill and the finance projection, transfer eligibility, AI
club behaviour through the shared pool, the `CareerState` changes and their migration, and
`simFreeAgents` with its controls.

**The UI lane.** A release action on the squad screen with a confirmation that states the
severance cost in money before it is agreed, since the whole design rests on that cost being
visible rather than discovered. A free agent list on the transfer screen that works when the
window is shut, and a finance line for severance.

**The QA lane.** The edge table in section 3.6 walked by hand, the copy on the release
confirmation and the free agent screen, and a pass on how the feature reads to somebody who has
never seen it.

The seam between the lanes is the engine's exported functions: `releasePlayer`, `signFreeAgent`,
`ensureFreeAgents`, and the two new `CareerState` fields. The UI lane can build against those
signatures before the bodies are finished.
