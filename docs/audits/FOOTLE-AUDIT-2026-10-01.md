# Footle live audit, 2026-10-01

Actual live URL: https://douknowball.com/footle. Entry `/assets/index-E8L0RxXO.js`, lazy bundle `/assets/Footle-DEmvcojY.js`. Isolated Chromium, 320x844 and a 1440x900 desktop path. Original pools, answers, engine and clock. No target or answer was injected or used to choose guesses. The server completion request was intercepted locally; no score, report, signup, analytics or ad transmission was permitted.

## Verified problem

**FOOTLE-01, P2: The result changes a USD value to euros without conversion.**

1. Play Daily through eight distinct valid suggestions.
2. Read the value tiles, then the answer fact below Game Over.

The tiles use dollar amounts. The pool fetch reads `market_value_usd`, but the revealed fact says Erling Haaland is valued at `€216M`. The same mistake appeared on the Unlimited result, which said Cristian Romero was valued at `€54M`. The result should retain the original currency, or perform and explain a real conversion.

Source: `src/pages/Footle.tsx:320` hardcodes the euro prefix. `src/lib/gameLogic.ts:112` formats the comparison in dollars. `src/lib/fetchFootlePlayerPool.ts:341` stores rounded USD millions. This is an internal unit mismatch, not a claim that the underlying real-world valuation is accurate or inaccurate.

Screenshot: `C:/Users/antho/AppData/Local/Temp/dukb-hostile-audit-2026-10-01/footle-daily-result-320.png`, inspected at original resolution.

## Actual play coverage

- Daily completed with eight distinct native selections and a loss. Unlimited completed with eight distinct native selections and a loss. The desktop path made one valid guess, canceled Give up, confirmed Give up, replayed, and returned to the completed Daily.
- Invalid input plus Enter consumed no guess. Arrow Down, Arrow Up and Enter selected the displayed option. Held Enter and a double-clicked suggestion each added one guess. A previously guessed name was excluded from the suggestions and Enter did not add it again.
- Daily reload after two guesses and leaving for Home then returning preserved exact save bytes. The completed eight-guess Daily also survived reload. Unlimited and replay left the completed Daily unchanged.
- Play Again reset Unlimited to zero guesses and restored its search. Give-up cancellation preserved the active guess. Desktop Unlimited actions produced zero additional mutation requests.
- All sampled page overflow and guess-action scroll deltas were zero. No uncaught page errors occurred. Preplay instructions were shown and native Escape closed them.

Seventeen actual player selections were made. Six coverage observations and the full native action receipts are in `footle-audit.json`.

## Limits and cleanup

The win-scoring path, every tier, every player, exhaustive persistence behavior and valuation accuracy were not tested. Unlimited progress is not saved by the current design; the Daily persistence checks are distinct. The table has an intentional internal horizontal scroll area on a phone, so zero document overflow does not mean every column fits at once.

Only disposable browser storage changed. The browser was closed. No product source, frozen simulation report, Git, build or published state was changed.
