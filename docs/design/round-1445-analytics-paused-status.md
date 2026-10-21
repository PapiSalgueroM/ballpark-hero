# Round 1445: explain paused Analytics without a dead checkbox

The reported Analytics checkbox cannot be clicked because Google Analytics is deliberately paused. This change replaces that unavailable control with a visible explanation. Advertising remains a working independent choice. Google Analytics stays paused until its account collection settings and a new loading implementation are reviewed.

Scope: CookieConsent presentation, matching Privacy wording and browser assertions, the existing copied expiry fault's equivalent presentation and pins, focused regression and remote verification. Preserve the existing consent schema, Analytics readiness false, empty Analytics loader, 180-day expiry, Global Privacy Control, withdrawal and pending game saves, help portal and focus restoration. No provider-account changes or tracking activation.

The agreed replacement is a plain paragraph, with no live or interactive role:

```tsx
          <p data-analytics-paused-status="">
            <strong>Analytics is paused.</strong> Google Analytics is off while we check its privacy settings.
          </p>
```

1. Commit only the new proof/workflow and claim documents. Dispatch `original` against the unchanged product at base `bc79b526cb69a4e913416c77c6dba00fe9401a16`. The type gate and unchanged consent baselines must pass. The one new focused case must fail only at `ANALYTICS_PAUSED_1445_DEAD_CONTROL`, after its Advertising and focus preconditions pass. Setup errors and other assertions do not count.
2. After retaining that actual RED, apply the small presentation/copy changes. Dispatch `green`. The same case and unchanged baselines must pass. A temporary copy of current CookieConsent restores only the old disabled Analytics checkbox. The same focused case must then fail at the same exact marker, with complete forward/inverse and source holds. No copied fault modifies the checked-out product.
3. Root owns broader remote build/browser/reader gates, exact release review, publication and readback. This focused proof alone is not product, legal or publication qualification.

The regression uses the actual component and preference/loader modules. It checks visible explanatory text, absence of an Analytics checkbox, working Advertising persistence, analytics false, no Analytics tag or globals, no fetch attempts, initial/reopened region focus, Cancel focus restoration and unchanged saved choices. Existing consent baselines retain GPC, expiry, storage, withdrawal and help/rules focus coverage.

All app execution is remote on GitHub Actions. No local Node, npm, parser, build, test or browser execution. The historical legal public workflow and receipts remain unchanged.

Actual original evidence: corrected63beaf695ddc3d3ff093956440eca2c4893469e3/run39664707661, one exact dead-control AssertionError after74 baselinePASS and real types. Artifact12375339227,247034B SHAcedaef64c55a3c87f522dd2af39005cf8ff73c29d3d088236580d2128d833c30, all16hashes independently held. Earlier94ae/run39664004370 failed five unsupported ByRole exact options in the new test, before the original outcome, and earns no original credit. No tracking activation follows.

First Green39667577518 passed the74+1 focused cases, new dead-checkbox control and six original consent control pairs, with4446 source hashes held. Build then failed the zero-transport gate on exactly three blocked Google Fonts stylesheet attempts in Privacy prerender. No requests left the guard. Its incomplete20-entry artifact31680a... has no evidence manifest and remains unqualified. The workflow-owned repair feeds only exact validated cached template/font responses before browser pages, requires actual use in all3 contexts and retains the zero-attempt gate. App code is held. Generated exclusions are only Privacy HTML/sitemap/lastmod, guarded before and after by unchanged other rows and two effective copied row faults. Always-hold failures now still produce complete evidence. Actual repair runtime remains owed.

## Complete failed artifact and final-source sequencing

Run39671962575 is complete but FAILED only at the weights transport hold. The actual source loop creates14contexts; the guard recorded14denied font and4denied flag-origin continues. It recorded origins only, so methods and paths cannot be inferred from that old artifact. All81 outer hashes,797 captured dist hashes,74+1 focused cases, seven effective privacy faults,8+3 browser cases,18 readers and14 unchanged caps were independently admitted as partial results. No release credit is transferred from them.

The workflow-only repair derives a separate weights preload from the exact ac09f64a font preload. Known font URL/body/manifest hashes remain mandatory. Only validated HTTPS flagcdn GET image requests are locally aborted and recorded, never forwarded or replaced with invented flags. Actual14contexts,14cached CSS fulfillments, fonts in each context,4local flag denials and three effective receipt faults are required in the new run. The sweep source438a626c, caps, original prerender preload and all product consent/tracking sources stay held.

The exact7339byte failed-artifact patch may be proposed solely as an unqualified candidate because source bytes, both semantic controls, exact two-file forward/inverse and all other ledger rows are independently bound. Overall initial success was a conservative sequencing choice, not a prerequisite for proposing reversible source bytes. The failed run remains failed. Fresh ALL-SUCCESS qualification at the adopted source must enforce0byte generated.patch/files and compare complete public/ledger/dist inventories before and after readers, with two effective copied-inventory faults. Only then may merge, publish, proper public verification, IndexNow and closure proceed. No local app/parser/runtime or live account verification occurs.