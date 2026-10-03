# Round996: sport-specific character creation

The live NHL character creator offered soccer boots, knee slides and corner
flags. All four US careers reused that soccer presentation.

The editor now receives the career's sport. NBA offers sneakers, NFL and MLB
offer cleats, and NHL offers skates. Fictional colorways and standing poses
replace soccer-only descriptions. The shared default still draws the original
soccer labels and text. Cosmetic presentation does not promise ratings boosts.

The18 footwear,19 celebration and16 accessory IDs retain their existing order.
Random selection, callbacks, appearance save shape, avatar art and simulation
engines are unchanged. The historical900 replay renders the real editor with
its recorded soccer presentation; its save-byte, random-draw and other screen
assertions remain exact. Actual US presentation is checked independently by
mounted editor tests and real career create-screen navigation.

## Verification status

Accepted in PR111, merged as `f7884d28a01dd8a585fc0fabe77bf5a234ed9b7d`.
Exact head `71140df9314dfac3b8eb9a9b882101a53d09bc92` passed all three remote
workflows. CI checkout `52a108b5cbc75cece2d7c538a97bba582439805b` and the real
merge have the same tree: `6882002e39aa50156ca2e9ab561da1fe87d4b792`.

- Appearance [37115444858](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37115444858):
  real app types/build,11 mounted cases, effective forced-soccer NHL control,
  both gear/import compatibility harnesses and all17 built readers passed.
- Ten native cases cover all five sports at390px touch and1440px keyboard
  with reduced motion. All30 layout samples have zero horizontal overflow.
  There were no save writes/removals, score-write attempts, page errors or
  failed app assets. External requests were intercepted locally. Footwear and
  pose changes reached the preview and survived changing tabs.
- Practice [37115444853](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37115444853):
  32 mounted cases/all12 controls, four historical career replays and targeted
  controls,48 training tests/43 recorded replays and six timing controls,
  all13 career families and17 built readers passed. Six native practice paths
  scored80, raised OVR70 to72, and passed reload lock, layout and focus checks.
- Prospect [37115444850](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37115444850):
  model/save/decision checks, historical replays with all six controls,
  retained practice/training checks, regressions and built readers passed.
  Six complete native prospect journeys and both viewport controls passed.

The first appearance run's soccer locator matched both the pose title and its
description. The final commit fixes that test selector only. Cancelled older
compatibility runs were not credited as acceptance. No fixture hashes changed.
No local build or browser process was launched for these gates. This is scoped
verification, not a full repository suite or a live database audit.

## Retained evidence

All three downloaded artifact ZIPs matched their published SHA256 digests:

| Workflow | Artifact | SHA256 |
| --- | --- | --- |
| Appearance |11270713711|`d94a2ccbf35a6c12562757d56f85410236092166bb5484bc071e0e32f5243d30`|
| Practice |11271359853|`a71a879a85fd6b44ab69a72169a41c2415eb00dcf8b0e2d4952c4b51d20785f8`|
| Prospect |11271760963|`b598f6f36351ff1059cbc4b0f06aaa1130db7f32df4a120275daaf306354ac80`|

Local evidence directories are `C:/Users/antho/AppData/Local/Temp/` followed by
`dukb-career-look996-ci-final`, `dukb-career-practice996-ci-final`, and
`dukb-career-prospect996-ci-final`. Full logs and concise review receipts are in
`dukb-career996-ci-2026-10-03`. Thirty appearance screenshots were retained;
NHL phone, NBA phone and soccer desktop views were visually reviewed.

Publication is pending. All12 held drafts and seven stashes passed preservation
checks after the accepted merge. AdSense and indexing submissions stay deferred.
