# Round526: NBA Arcade visible territories

Claimed September8 from Round524 f51cbe5e. The resumed task owns525; this
original overnight task owns526. No worktree or process is shared for edits.

## Scope and acceptance

Source audit found60 STATE_POSITIONS entering NBA Arcade, although its map
draws58 NBA_STATES and INITIAL_TERRITORIES_NBA assigns exactly those58. The
excluded parents CA_N/TX_S are the only initial neutral regions, receive the
only initial power markers, and enter the neutral-target/claim path. Hidden
ownership then affects territory counts, centroids and battle advantages.
This does not prove the game unwinnable; win checks count remaining owners.

Reproduce real hook initialization/reset/turns against rendered region IDs.
Change the initialization loop only, leaving team data and all existing rules
alone. No valid initial neutral land means no initial neutral power markers.
Adding new land or moving powers onto owned regions is a separate rule change.
Preserve the losing-attacker retreat regression and exact visible assignments.

Tests must deny unexpected transport/backend/storage writes, use deterministic
randomness and real hook transitions, and show exact failing controls. Run
both exact types, build, fifteen generated-site fences and a local browser
check at phone/desktop widths. No full default suite or production action.

## Results

Pending reproduction. No production edits yet.
