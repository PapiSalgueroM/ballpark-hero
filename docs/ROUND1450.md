# Round1450: poll day at noon Eastern

The poll day is intended to roll over at noon in America/New_York. The existing helper subtracts twelve elapsed hours before formatting the Eastern date. Source inspection identifies different behavior during the daylight-saving transitions.

This initial child adds thirteen clock-controlled helper cases and a fifteen-minute ordinary CI job on codex/poll-noon-1450. It leaves the date helper unchanged. The cases include the two transition dates, ordinary summer and winter dates, New Year and leap day. Source inspection predicts four owned AssertionErrors and nine healthy cases. These tests are unexecuted at authoring; this prediction is not runtime evidence.

The remote test process must keep its ordinary failing exit. Its raw JSON, stdout/stderr, test exit and complete tracked-source/input/offline receipts are retained even on failure. Root must admit all thirteen actual case outcomes, including the exact four errors, with no import, setup or unhandled failure before implementing the helper change. Missing tests or a setup failure do not establish the intended RED.

This round does not yet prove the caller's query date, refresh an already mounted poll at noon, change backend rows or qualify a release. Later helper implementation and fresh Green verification follow actual Original admission separately. I retains publication and game ownership. No qualified or live result is claimed.
