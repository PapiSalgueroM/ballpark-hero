# Round1426: keep the newer report draft

Status: diagnosis in progress, no product change or runtime credit yet.

Both report forms capture the submitted payload correctly, but their async UI completion and1500ms reset are not bound to that submitted draft or dialog opening. A player can edit, close and reopen while the request waits. The older completion can then hide and erase the current draft. This is a source hypothesis until actual remote reproduction is admitted.

Chosen behavior: preserve editable drafts and existing delivery. A late relay/fallback result and an older success timer may update only their own unchanged draft/session. The already captured report still completes its delivery/fallback. The Send button stays disabled while its request is pending. Normal success retains the current message,1500ms auto close/reset and focus return. Errors for the current draft remain retryable. No report payload, collection, API, database or game-state change.

Verify on both actual components: details-only edit; category-only edit; pending close/reopen without edits; reopened edit while direct fallback waits; reopening after a success timer starts; late failure on a newer session followed by current retry; ordinary success at1499/1500ms with focus and blank reopen. Preserve existing reportDetails19 and reportContext5 cases and the source report fences. Browser proof uses actual built route forms at390/1280, native actions, fully intercepted requests, and explicitly identified timer control if used. No real report or email may be sent.

Actual original failure precedes product adoption. The fixed proof must exercise genuine code-removal controls and restored equality, not zero-test/setup/timeout faults. Type gate, serial plain build,15 readers and14 unchanged fatal caps. No fullsuite, protected source, integration or live claim.
