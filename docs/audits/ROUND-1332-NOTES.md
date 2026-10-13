# Round 1332 notes: the shared deck, part two, and the inbox panel half

Branch r1332-deck-kit, base origin/main 082fc277 (Release BC dec9075b plus the 2026-10-13 handoff).
FENCE_BASE is 082fc277. Brief: C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1332.md.
Nothing a player can reach changes: no route mounts GmInboxPanel, and the US careers' inbox renders
as before (it passes no settledLine).

## Steps

(a) The panel half. InboxPanel takes one optional prop, `settledLine`; asked only about an
answered card, and when it returns a line, that line shows in the reply box's exact classes
(`data-inbox-settled`) instead of "You replied". GmInboxPanel passes
`m => gmExpiredLine(<the message as saved>)`, and its full desk sentence adds ", or your assistant
deals with one for you." only when an open card's def can expire. The kit's section 7
`panelexpiry` control now also strips the gmExpiredLine call from the fence's copy of the code.
Proof: see the runner results below.

## Runner results

(filled at every push)
