# Round 970 native preparation, unexecuted

Authored on 2026-10-03 from the retained968 native fixture. No preparation,
build, test, browser launch or process termination was run by the author.
All files in this directory are disposable QA artifacts, outside app imports.
The repository source was only read.

Parent owns the machine resource gate and must schedule both commands serially.
First integrate the reviewed970 receipt and seven Board hunks into the isolated
final source gate. Keep the969 human-owner offseason argument. The intended gate
is `C:/Users/antho/AppData/Local/Temp/dukb-nhl970-clean-gate-2026-10-03-resume`.
An alternate gate can be supplied explicitly.

```powershell
$taskNative = Join-Path $env:TEMP 'dukb-nhl970-native-2026-10-03-resume'
$env:NHL_WAIVER_NATIVE_GATE = Join-Path $env:TEMP 'dukb-nhl970-clean-gate-2026-10-03-resume'
node (Join-Path $taskNative 'prepare.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Native preparation failed; preserve its log.' }
node (Join-Path $taskNative 'driver.mjs')
```

Save command logs and exit codes. The preparation compiles base CSS from the
gate's current `src/index.css` and Tailwind configuration, then bundles the
actual Board and receipt CSS module with esbuild. It never reuses old `dist`
CSS. It records raw input and output hashes in `build-receipt.json` and keeps
`build-inputs.json`. Gate files need not match the current root candidate.
Root files, including the absence of any unadopted root receipt files, are held
unchanged between preparation and native execution. Run before root adoption,
or prepare again after adoption so those raw holds represent the same state.

The driver uses one Chromium and serial contexts at1440x900 with actual Tab and
Enter,390x844 with native taps, and320x740 with native taps and reduced motion.
It fulfills the synthetic loopback origin through browser routing, starts no
host process, blocks outside HTTP and WebSocket requests, and closes only its
own browser. It does not touch an existing browser or listener.

The fixture retains968's actual engine trades, generated draft selections and
offseason to make a17-player simulation roster. Its offseason passes the human
owner explicitly, as969 requires. No real statistics or new facts are invented.
Completion, activity and share boundaries remain inert. The scope is the actual
isolated Board, not the entire site, a full career or financial balance.

The authored checks cover:

- Native arm, Keep cancellation, two confirmations and recovery from17 to16 to15.
- Actual engine-derived player, roster count, cap space and committed dead money.
- Exact existing league result, unchanged RNG for waivers, one write per waiver,
  unrelated save bytes, passive save bytes, exact restore bytes and the second
  complete save after existing first-write optional-field normalization.
- Immediate viewport and focus samples after confirmation before any inspection
  scrolling or Tab recovery. An offscreen receipt or document/grid scroll jump
  fails rather than receiving credit from a repositioned screenshot.
- Final receipt text at DOM insertion, computed420ms one-shot emphasis, actual
  animation start/end events, settled final values and no continuing animation.
- Static reduced-motion values, no animation events, polite atomic live status,
  one earned node per event and no focus stolen by the status.
- Same event node, no new animation and no save/RNG change on passive Hub return.
- No restored event after reload and no receipt from ordinary recovered play.
- Receipt text fit, stat-block overlap, horizontal page overflow, native scale1,
  and existing44px Open roster, arm, Keep and confirm controls. Existing Play is
  hit-tested without claiming a44px size.
- One native played round against the existing engine/AI and RNG tape. Generated
  `id` fields are removed only for that established one-round outcome comparison.

One explicitly labeled direct live React callback per layout probes disabled
play refusal. It is not counted as a natural disabled-button interaction.
Receipt values and successful waivers all come from native inputs. Engine helper
calls calculate independent expected outcomes without touching the saved state.
Programmatic scrolling is used to inspect controls and take final screenshots;
the immediate receipt/scroll verdict is captured before such repositioning.

The separate Board outcome driver owns the independent complete-save baseline
proof, duplicate callback, waiver-floor refusal and lifecycle cases. Native
coverage here does not claim those distinct checks.

Every execution gets a new `run-<timestamp>` directory with checkpoints, a final
report, and screenshots. Failures retain a snapshot with raw save, motion events,
immediate receipt geometry, focus and scroll values. Do not weaken a failing
visibility or scroll assertion without investigating the actual rendered Board.
Parent must inspect the screenshots and retain failed attempts before reporting
this work as accepted. These files have not been syntax-checked or executed.
