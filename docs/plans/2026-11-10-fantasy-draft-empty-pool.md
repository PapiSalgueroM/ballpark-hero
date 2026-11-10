# Fantasy Draft empty player-pool recovery

The held Fantasy Draft page already recovers from a request error. A successful player reply with null or an empty list leaves pick one without the existing Retry players action. This separate source finding arose while reviewing player feedback. It does not establish the cause of R0038 or R0153.

1. Verify the direct App route, actual Soccer catalog entry and indexable saved page on PR543.
2. Reproduce the failure against the original page for both response shapes and both starting seats. Preserve healthy loads, prior transport-error recovery and daily criteria cases.
3. After the original is admitted, route the successful empty responses through the same Retry. Verify that the same seat, rule and pick resume with legal fictional players. Prove source rollback, restore, the production build and native route. Keep roster and release holds.
