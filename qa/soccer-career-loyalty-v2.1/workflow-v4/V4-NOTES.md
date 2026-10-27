# Workflow v4 QA corrections

Selected product/test manifest fb269ba3dd4b68d6700e0d85cf48481459378742a39fa15730e48ffdd6d5c803 remains unchanged. Preserved workflow-v3 remains held.

Only the qualification controller and mounted-browser helper change.
- Actual admitted early Vitest3.2.7 JSON has testResults[].message, no numRuntimeErrorTestSuites field. The same-version installed reporter source was read natively without execution: JsonReporter ignores its _errors argument; verbose reporting prints unhandled and failed-suite diagnostics.
- Every targeted unit invocation now requires empty suite diagnostics, actual completed verbose/JSON CLI output, complete collected assertion accounting and no unhandled/collection/failed-suite/running-test diagnostics. No absent JSON field earns credit.
- Two copied baseline diagnostic controls change only suite.message or retained CLI text while keeping all39 assertion rows and expected outcomes held. Each must be rejected by the relevant diagnostic guard, with the original accepted and unchanged.
- Every normal browser attempt is retained as STARTED before actions. Failed assertions retain actual error, URL, last available state, page errors, HTML, PNG and any capture errors before closing the context. Font and geometry observations are written before their assertions.
- Warning source-control attempts are also retained before actions.
- One extra browser context deliberately supplies empty cached font responses. The actual selected quote callback must still work; the declared-font guard must specifically reject the empty font set. It retains the real failure DOM and PNG. The later restored-warning context checks the actual loaded fonts again.
- Planned normal cases remain9, with the same game assertions. Browser controls are now font denial, missing warning, healthy restoration. Planned36PNGs if every expected path completes. Actual artifact inventory decides counts. The font-denial and missing-warning captures are owned faults, not healthy app pixels.

YAML, admission, font preloader, entry, selected metadata and all product/test bodies remain byte-identical to workflow-v3. No local app/Node/parser/compiler/test/browser/Git execution, artifact reacquisition or remote mutation.
