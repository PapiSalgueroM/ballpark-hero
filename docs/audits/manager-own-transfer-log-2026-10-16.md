# Manager own transfer log

The visitor asked to find their purchases and sales with the other club shown. The Latest transfer tab already rendered saved counterparties and gross fees, but it showed the whole world's latest 50 rows. Newer AI deals could push every one of the manager's deals out of that view.

The new All clubs / Your club filter uses exact saved `from` and `to` before sorting and the 50-row cap. Purchases, sales and loans stay as recorded. The separate `seasonSignings` ledger stores net sale proceeds and lacks counterparties, so this change deliberately does not join that different record into a false gross-fee history. The view explains that it has recent recorded deals only. The engine caps retained world deals, so a complete historical archive is a separate persistence task.

No market actions, player data, core/world simulation, schema or saved bytes change. The default All clubs view and both existing sorts are preserved. Independent source review found no blocker.

## Remote evidence

- Baseline `3cd9507107bd988dad44f97ffaf25e6b7b4c2322`, run `38878573962`, passed types and the exact six missing-display faults/four preservation contract.
- Fixed `96ad681bd81e6eeb88cdea46f69051cd8db37dad`, run `38879792592`, job `116903493782`, succeeded.
- All ten real component cases passed, including filtering before the cap, current-club rerender, counterparties, loans, gross/net separation and no callback, RNG or input-state mutation.
- The complete original component reproduced exactly six intended missing-display failures and four passes. Restoring the product passed all fifteen new and prior transfer-deal cases.
- App types, the actual production build and all fifteen rebuilt-site readers passed. Source and package holds passed.
- Artifact `12037003332`, 34,978,635 bytes, SHA256 `122b5d6d93c8c7ecc00ba3e2ceca758ccad23b6df17997695689e7944042c328`, retained at `C:/Users/antho/dukb-handoff/2026-10-16/manager-transfers/artifact.zip`. Root reopened all three JSON reports, original failure causes, reader outcomes, build output and the tested component copy.

Draft PR284 is ready for Claude I to integrate. It is not merged or live. No browser-layout or full-suite claim is made. Final documentation leaves tested application, test and workflow bytes unchanged.
