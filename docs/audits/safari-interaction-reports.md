# Safari interaction reports, Round1388

Owner forwarded both reports on2026-10-16 while BI is in qualification. This is diagnosis first, no confirmed Safari-specific cause yet.

- Soccer Career: Start career does nothing. Submitted2026-10-16T21:15:13.697Z, published buildindex-BQUxuJaU.js,1080x751/DPR2, macOS Safari26.6.1, en-GB.
- Build Your XI: cannot choose players. Submitted2026-10-16T19:03:18.896Z, same published build, Real Madrid,4-4-2,1180x768/DPR2, iPad CriOS156/WebKit, en-US.

Source basee814c2def671e07bd6163462dff8ab1230be2000 has the published BH application. Keep existing data, sporting outcomes and save policy unchanged. Use actual component/engine tests and native production-browser actions. A public report does not establish its trigger or Safari exclusivity.

Source candidate, not yet runtime reproduced: SoccerCareer.handlePositionChange clears parent previewStats/rolledOvr, while CreationScreen keeps its own rolledOvr. A completed roll followed by a position change can therefore leave Begin Career enabled while the parent handler silently returns. The active setInterval also lacks cancellation if the creation state changes. First qualify this precise path and normal creation before choosing a narrow correction. Build Your XI source scout is parallel and read-only.

Success: complete observed creation and player-selection journeys, preserve unrelated inputs and callbacks, show effective original-source failures for confirmed fixes, pass real app types/build, related regressions, all15built readers and unchanged weights. WebKit coverage must be actual installed WebKit, not a Safari user-agent on Chromium. State exact prepared/offline and physical-device limits. I owns final joined proof and publication. No fix, runtime pass or live claim exists yet.