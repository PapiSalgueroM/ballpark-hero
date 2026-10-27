# Club Manager shootout results

Default shootouts previously kept only who won. Named kicks and totals were supplied only when a manager had set a taker order. Newly played default shootouts now provide the same recorded total and chronological scored/saved/missed list already shown by the match report and live match viewer.

The original winner decision and its one global random draw are retained. That draw seeds a detached stream using the existing shootout simulation and default finishing players. At most128 samples are tried; only a matching winner with totals backed by the last recorded kick is accepted. Exhaustion preserves the winner and supplies no invented record. Existing selected orders and the existing fifty-round explicit-order fallback are unchanged. Old transient reports are not reconstructed or added to saves.

Baseline04eec182509d1d8558d8a5988780b03f9de14b05/run40444158592 compared159 actual matches against immutable b20 source:39 missing-detail assertions, all state/random-stream/other-report checks passed, ten effective output controls. The seven focused unit cases had six intended failures and one preservation pass. Earlier workflow-context and JSON-clone method failures are retained and are not gameplay qualification.

Fixed qualification is pending. It will compare the same matches, verify four actual source faults, retain all twelve previous order/keeper controls plus a tied-record normalization control, check actual result-list rendering, build/readers/caps and the complete application unit suite. The historical guard removes only validated new default detail and the exact penalty-event score suffix from its legacy comparison; raw reports and raw hashes remain retained.

This immutable-base proof is scoped to b20. Owner I must reconcile combined current-target engine/state changes and perform integration and publication. No main or live result is claimed.
