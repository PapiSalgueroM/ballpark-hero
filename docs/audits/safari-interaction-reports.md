# Safari interaction reports, Round1388

Owner forwarded both reports on2026-10-16 while BI is in qualification. This is diagnosis first, no confirmed Safari-specific cause yet.

- Soccer Career: Start career does nothing. Submitted2026-10-16T21:15:13.697Z, published buildindex-BQUxuJaU.js,1080x751/DPR2, macOS Safari26.6.1, en-GB.
- Build Your XI: cannot choose players. Submitted2026-10-16T19:03:18.896Z, same published build, Real Madrid,4-4-2,1180x768/DPR2, iPad CriOS156/WebKit, en-US.

Source basee814c2def671e07bd6163462dff8ab1230be2000 has the published BH application. Keep existing data, sporting outcomes and save policy unchanged. Use actual component/engine tests and native production-browser actions. A public report does not establish its trigger or Safari exclusivity.

Source candidate, not yet runtime reproduced: SoccerCareer.handlePositionChange clears parent previewStats/rolledOvr, while CreationScreen keeps its own rolledOvr. A completed roll followed by a position change can therefore leave Begin Career enabled while the parent handler silently returns. The active setInterval also lacks cancellation if the creation state changes. First qualify this precise path and normal creation before choosing a narrow correction. Build Your XI source scout is parallel and read-only.

Success: complete observed creation and player-selection journeys, preserve unrelated inputs and callbacks, show effective original-source failures for confirmed fixes, pass real app types/build, related regressions, all15built readers and unchanged weights. WebKit coverage must be actual installed WebKit, not a Safari user-agent on Chromium. State exact prepared/offline and physical-device limits. I owns final joined proof and publication. No fix, runtime pass or live claim exists yet.
## Source checkpoint before remote baseline

Four actual mounted-page tests use the real engine and save parser with fake timers and unrelated shell/transport seams. Expected published-source outcomes are two precise stale-position faults and two preserved starts. Raw UI/storage/complete saved state and draw observations are retained before assertions. No production source has changed.

The native creation method uses actual built Radix controls and trusted clicks/taps: WebKit1080x751/DPR2, WebKit390x844/DPR2 and Chromium1080x751/DPR2, each fresh/settled-position/in-flight-position. The baseline requires six exact old-source observations and normal fresh starts plus reroll recovery. Reload is compared to the actual compiled repairCareer and save serializer, including their existing migration fields. Each qualifying path checks page exceptions, actual asset failures, unrelated storage and trusted inputs. WebKit on a Linux runner is not a physical Safari device.

The separate XI method uses the actual built route/hook/search with declared fictional keeper transport rows, actual Real Madrid/4-4-2 controls, WebKit iPad/phone taps and Chromium touch/mouse references. A Chromium-only native CDP cancellation is separate; WebKit drag/cancel and soft-keyboard behavior are untested. Actual query legs, events, geometry, saved storage, source and matching served dist are retained. It tests interaction, not public database contents or availability.

The new baseline workflow pins Playwright1.64.0, installs actual Chromium and WebKit, caches declared fonts, runs the real app type gate, exact4case regression baseline, production build, all15readers, both native methods and the unchanged full offline weight sweep. Complete tracked-source, dependency and emitted-dist hashes must hold. Independent source review corrected reload migration handling, rolling-branch common checks, logical option ancestry and explicit SWEEP_OFFLINE. Remote baseline has not dispatched yet.
Independent source review PASS before baseline: frozen unit8c0b6861; corrected SC browser13b1e37e; XI74438f92; workflowc01d97f2. Reviews verified exact outcome classifiers, actual save repair, all qualifying-branch guards, option ancestor attribution, filled-slot observer and offline weight binding. All production src/package bytes still equal e814. Source preparation is committed withskipci; the following empty request commit starts the first actual remote baseline. No runtime outcome is asserted here.
