# Round1442: legal, AI disclosure and privacy controls

Authorized by Anthony on 2026-10-21: implement and publish the legal/AI changes and fix remaining consent/privacy issues. Base main: 3c56c21f835d46743fe5cab337b9fb46e38e3242. Branch: codex/legal-ai-privacy. This lane excludes queued gameplay changes and all older unmerged Root branches.

1. Add remote regression checks for separate advertising/analytics choices, migration, expiry and withdrawal. Verify expected baseline failure, then implement and verify purpose-specific loading, footer/help behavior and preserved saves.
2. Align Terms, Privacy and About with actual behavior, AI use and mandatory consumer rights. Label simulated stories and remove prompts for invented real-person allegations. Verify source and rendered legal copy.
3. Inspect account-linked schema metadata. Implement and remotely test a minimal authenticated own-account export/deletion path if its authorization, backup coverage and stale-token protections can be demonstrated. Preserve 30-day request promises; document any operations requiring manual identity verification.
4. Run actual types, production build, relevant consent/privacy tests, built-file readers and full unchanged page-weight caps remotely with offline transport. Regenerate affected saved heads and legal pages remotely, adopt only reviewed generated output.
5. Review the exact final diff, merge the scoped PR, recheck main and Lovable ownership, publish and verify the public legal/consent behavior. Record actual receipts and limitations. No legal-risk elimination guarantee or claim of counsel review.

All app execution stays on GitHub Actions. No local Node/npm/app tests/build/browser. Primary source/index and previous audit packets remain held. New source lives only in the independent checkout. No money, real-user deletion, live AI/report probes, secret reads or external messages are authorized by this plan.
