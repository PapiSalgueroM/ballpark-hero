# Round1000: the playable basketball court

2026-10-03. Isolated presentation work. Not accepted, merged or live.

## Design contract

The player should see an athlete release a basketball toward a real-looking
hoop while every aim preview, flight and result continues to match the existing
simulation. This improves the current game rather than adding another mode.
The repeated decision remains Power, Arc and Fade, with retries showing what
changed. Daily, Unlimited, Steady practice, contest and Shot lab keep their
existing rules, worked examples, scoring, saves and progression.

The court is the visual focus. Use a quiet arena backdrop, maple floor detail,
glass and padded basket support, an articulated fictional athlete and a ball
with seams. Plain training clothing has no logos, team markings, kit patterns
or real-person likeness. No external images or new sports facts are introduced.

Palette: arena navy #142235, seating blue #253e55, maple #d8ab6f, warm training
top #f2ca76, cool opponent #64b7d5 and basketball orange #f58a31. Existing site
type and controls stay in place. Labels describe geometry or game state only.

Layout stays a side elevation, not a perspective background that contradicts
the flight. Keep the existing360x210 viewBox and projection. The shooter's wrist
meets the release point, the defender's hand marks the actual contest reach,
and the rim keeps its exact scored location and span. Art sits behind previews
and retained trajectories. The court remains one pointer surface; child artwork
cannot capture input. Move the existing rim-height readout below the court,
beside the legend, so it cannot obscure a target or a valid flight.

```text
quiet arena backdrop
             actual flight path
athlete       closeout              glass + rim
floor marks and maple boards
trajectory legend                     rim-height readout
existing power / arc / fade / shoot controls
```

Follow-through and seam rotation use existing flight progress. There is no
independent clock, random motion, looping decoration or extra animation frame.
Pause freezes the art with the ball. Reduced motion uses the settled pose.
Do not invent a rim bounce, net contact or success reaction for a miss or block.
A static detailed net is preferable to an unproven reaction.

## Verification contract

New geometry/pose outcomes must be exercised against actual rendered elements,
with effective copied-source controls and unchanged original-mode baselines.
Preserve every existing Shot lab anchor and run all15 outcomes/16 controls,
original arcade modes, physical paths, daily reload and saved-score regressions.
Real app types/build and all17 built readers run remotely, sequentially after
the build. No local runtime gates or production database probes.

Native checks cover320/390/430/1440, dark/light, paused flight and reduced motion.
Measure court/controls, page width and readable trajectory/inset context. Verify
fixed releases retain exact ball/rim/path geometry, compare actual screenshots,
and reject hidden artwork or geometric drift with focused effective controls.
Inspect the images for recognizable silhouettes, unobstructed trajectories and
an obvious improvement over the accepted line-body court.

The first source review found an existing longest-shot defect: at8.6 metres,
the physical rim center projects to(307.29,68), inside the opaque readout disk
at(306,46) with radius34. Its entire rim is covered. Keep the readout's numeric
geometry unchanged and relocate it outside the playable court. The final native
proof must reject overlap, show the whole readout and preserve identical shot
outcomes. PR118 contains the isolated pass; remote verification is in progress.

## Shipping boundary

Accepted998/999 remain ready for publication and do not depend on this work.
Keep this pass isolated until their live receipt resolves the publishing queue.
Root held drafts/stashes and Claude's separate career/manager lanes remain intact.
AdSense and indexing submissions stay deferred.
