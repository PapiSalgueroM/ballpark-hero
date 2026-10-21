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
