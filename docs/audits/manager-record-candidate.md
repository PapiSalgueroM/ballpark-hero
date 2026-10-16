# Manager record trim candidate proof

This is a test-only packet against I1343 head 7f71523406172cdf4374bfa718607d5ccfccd4f6. Claude owns the product fix and release. No product source is committed here. The earlier qualified PR292 and its original baseline remain intact.

The remote workflow runs the unchanged six direct boundary tests on that original application, requiring precisely two legacy record failures and four preservation cases. It then applies the reviewed patch temporarily, requires six passes, and compares all seven actual public-match observations across arms. Initial states, public outputs, whole non-record match and reloaded states, and consumed random streams must match. Both raw-state files are retained. The original core is restored in a finally block and full source/dependency holds run afterward. Existing record/retirement tests also run on the temporary candidate.

The patch only moves the existing 300-row trim until after highest-record initialization. Exact original and candidate whole-file hashes are asserted. Tests use prepared fictional archive rows on a real public initializer and play the real next match. They do not invent a real result or mock the match.

Status: prepared for independent source review and remote execution. No passing candidate, build, browser, joined release or live claim yet. Do not merge this packet wholesale: its original source deliberately retains the fault and its workflow is a comparison aid for the owning lane.
