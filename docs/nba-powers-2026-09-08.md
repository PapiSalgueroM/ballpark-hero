# Round 527: NBA Arcade visible powers

Base 526 7c8168f8, draft PR77. User resumed work September 8.

## Design contract

The existing objective remains one team owning the map. Successful conquests
now award one power after player selection, unless that conquest ends the game.
An away loss or shielded defense does not conquer territory and earns none.
This is the app's Arcade rule, not a claim about the reference video's rules.

Keep the existing five team/game modifiers. The award's team stays attached
through selection. Use now or save up to two for that team, replacing the
oldest with visible warning when full. Saved powers reopen from the ready
screen. Free-agent rewards recruit only players available from eliminated
NBA rosters; no football or new current-market data enters this flow. Upgrade
and territory-steal choices follow the existing card promises. Canceling a
selection returns to its card without spending a second power. An unavailable
effect must have a clear way back.

Shields protect one losing home defense. Upgrade boosts the selected in-game
roster entry for that owner's next simulated battle, including when defending;
unrelated battles do not spend it. Legends reuse existing NBA data. Territory
steals choose only valid nearby enemy regions, update elimination, and finish
the game if one owner remains. Duplicate inputs must consume/award once.

This remains an unranked session Arcade mode; no daily save, points, account
or backend protocol changes. Reset and unmount cancel deferred actions. Mobile
buttons, reopenable instructions, worked example and honest copy are required.

## Verification plan

First reproduce missing ordinary rewards and dormant recipient/lifetime bugs.
Real-hook tests drive actual seeded battles for acquisition; scoped fixtures
may choose a power without replacing the state transitions. Assert effects,
not badges. Cover each effect, save/reopen/capacity, rejected stale clicks,
no-effect exits, visible territories, completion and reset/unmount.
Every new guard gets an exact changed-source control. Preserve the existing
away-loss and visible-region checks. Then exact types/build, fifteen built-site
fences, phone/desktop actual interactions with intercepted transport, and
independent review. No default broad suite or production probes.
