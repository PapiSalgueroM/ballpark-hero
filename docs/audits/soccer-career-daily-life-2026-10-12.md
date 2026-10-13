# Round 1350: Soccer Career everyday decisions, 2026-10-12

Owner request: deeper, more complete Soccer Career and Club Manager with realistic day-to-day decisions and substantially more events. This is the first bounded Career increment through the existing played event flow, alongside H's broader depth inventory/framework planning. It does not introduce a live weekly calendar into saved-season replay.

Accepted base: 48cb9d4bbe8d8f4922113326d9db5d120dcb0b09. Isolated branch codex/soccer-career-daily-life. Protected root source/index, seven stashes, peer opponent/award/potential drafts and frozen Transfer Path PR242-248 remain held. H owns main, integration, publishing, active Club Manager engine/league-board/AZ and US/GM work. No external chat messages.

Design: add 30 contextual everyday football-life events through a new types-only soccerCareerRoutineEvents module and the existing getLifeEvents seam. Scenarios cover ordinary training-ground work, squad responsibilities, travel, reserve frustration, loans and family time. Every choice states its actual modest morale/integrity/popularity or queued next-season attribute effects. No invented real-person dialogue, sports facts, match results, hidden trust fields or new random probability promises.

At most five new candidates enter the existing season draw. A stable rotation uses saved season identity and player identity, with context gates that do not infer unrecorded minutes or routines. Five candidates is not five shown; the existing 2-4-card draw and priority beats remain unchanged. New candidates deliberately change shuffle consumption and career outcomes; only catalog reads add zero random calls. A queued routine card stays resolvable by its saved ID after another choice or JSON reload, even if current offer gates change. Effects and choice indices remain stable.

The two genuine next-playing-season life promises are esports 226->227 and boots 230->231. Existing stage-one flags and the existing priority hook can deliver those follow-ups without a new save field or engine change. Retired careers receive no new playing-season priority. The boots follow-up must describe the saved season ending, without inventing a hat trick. Other open-ended repayment/podcast/lookalike stories retain their existing timing.

Plan and verification:

1. Author actual getLifeEvents/priority/engine tests first, then run their strict causal baseline remotely. Baseline must identify missing routine cards and missing promised priorities while preservation cases pass.
2. Bind the new pack and priorities. Verify all 30 cards, every choice's exact saved effect, context exclusions, stable reads with zero RNG calls, actual two-card choice/JSON reload continuity and actual queued attribute consumption. Verify promised priorities arrive next playing season once, preserving choices/costs/cooldowns.
3. Run meaningful source-removal/effect controls, real app types, full production build, related career regressions and every rebuilt-site reader. Keep existing cooldown bands unchanged and interpret their measured output.
4. Play actual production event cards at phone and desktop widths, answer/reload/advance, retain original images and complete reports/logs/source/package receipts. Commit and push the qualified packet, open/attach a draft PR and update PROJECT-STATE. H owns final merge/publish.

All application/helper/parser/compiler/test/build/browser/install execution remains remote on GitHub Actions. Native Windows authoring/file/text/archive/hash/Git inspection only. Offline fixtures and external transport blocking, no production database probe/write. This note records intended checks, not passing runtime or live acceptance.
