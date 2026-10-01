# Round 770: First Touch training contract

Status: design approved within Anthony's standing autonomy. Exact ownership is claimed on WORKBOARD before source edits. This is a drill inside Soccer Career's existing Training Ground, not a new route or catalog game.

## Objective and loop

Control ten incoming balls into the marked exit gate. Each round shows an incoming ball, the contact spot at the player's feet and one of three exit gates: Left, Center or Right. Choose a direction, then press Touch as the ball reaches the contact spot. Both direction and timing decide the outcome. No random success roll follows an input.

The pure seeded engine owns each round's incoming path, arrival time, target gate, contact window and resolved outgoing path. The board draws those same values. A correct direction inside the contact window is one clean touch. An early or late touch, or the wrong exit gate, misses. Every round has a legal winning input and a legal losing input. Later rounds have narrower windows. Seeded variations prevent one fixed press time and direction from dominating.

After resolution, show the scored early/late/direction verdict and settled clean-touch count. Next advances explicitly. All ten settled rounds lead to the result. Controls remain immediate and stable; finite ball resolution and result feedback respect reduced motion. No automatic page scroll.

## Controls, rules and example

Pointer/touch players use three direction buttons and a Touch button, all at least 44px. Keyboard players use Left/Right arrows to choose a direction and Space to touch while the active playfield owns focus. Native buttons, forms, help dialogs and navigation must not trigger a second gameplay action. Show selection and visible focus.

Instructions appear before starting, and a 44px question-mark button reopens them. Explain objective, ten rounds, narrowing timing, score, daily/practice modes and banking. Worked example: a Right gate with arrival at 1.5 seconds is won by choosing Right and touching inside its shown contact window; a Left choice or a press before the window misses. Example values are generated mechanics, not a claim about a real player.

Use the existing compact training dialog, tile menu and Back behavior. Fit the playfield and controls at 320px; long result/rule text wraps. Page scroll and button/ball layout must not jump on a result. Explicit Pause/Resume and automatic hidden-page pause freeze active time. Resume requires fresh input. Closing, resetting or switching mode cancels scheduled work and invalidates stale callbacks.

## Score and rewards

Each clean touch scores 10; each miss scores 0. Ten rounds produce an integer session score from 0 to 100. The existing career banking pipeline receives `onDrill('firsttouch', cleanCount)` only for an eligible completed daily run. It awards at most +1 Dribbling at 50 and +2 at 80, capped by existing headroom and applied with next season's growth. The shared `trainingSeasonYear` guard still permits one session per season across all drills. Practice never invokes banking.

Preserve all three position-drill mappings, existing seeds, record slugs, reward formulas and parent callbacks. Add only the new optional kind/stat metadata and a distinct seed salt. First Touch must never be passed to the existing wallshot/tackle/gloves board or its fallback. No changes to the parent career page or career/life engine.

## Daily and persistence

Pin the Eastern date at mount using `getTodayET`. The daily seed is the same for everybody that day and changes with the date. Use the existing dailyRecord envelope and a new namespaced slug. Validate version, rounds settled, count, matching score and banked flag. Reject malformed records. Settled rounds resume after reload; a completed daily is readable and cannot be dealt again. Persist a banked marker before a callback can be repeated. Practice uses a fresh seed and never overwrites daily progress.

Persist only drill progress/results, with no new account or remote writes. Availability comes from existing parent state. No new real players, facts, data sources, images or attributed dialogue are needed.

## Acceptance

1. Engine harness: same seed has identical ten setups and outcomes, Eastern daily seeds differ, and old drill seeds stay unchanged. Every sampled round can win and miss. The later timing windows are strictly narrower than the early ones.
2. Measure skilled timing/direction against a swept fixed-time/fixed-direction baseline over paired seeds. Set the margin from the observed distribution and retain measured headroom. Do not assert a noisy maximum or non-significance. Assert the real values in output.
3. Actual Board tests: pointer and keyboard input produce exact engine outcomes, ten-round completion, persisted checkpoints, reload, completed-run restriction, practice isolation, one-bank callback, capped career reward, reset/pause/hidden/close and stale scheduler protection.
4. Asserted copied-source controls must change a real anchor and expose missing timing, target, daily-seed and bank guards. Unrelated tests should remain green. Shared source remains untouched by controls.
5. Browser proof at 320, 390, 768 and 1440px in full/reduced motion: actually play successful and missed rounds, complete daily/practice runs, reopen help, verify exact saved counts/banking, keyboard focus, stable nodes, 44px controls, zero horizontal overflow and zero page errors. Scope fixture boundaries explicitly.
6. Exact app type gate, isolated production build, all fifteen built-site fences, existing career-drill/motion harnesses and the new auto-discovered sim pass after the build finishes. Root owns publication handoff and docs; Claude owns publishing.
