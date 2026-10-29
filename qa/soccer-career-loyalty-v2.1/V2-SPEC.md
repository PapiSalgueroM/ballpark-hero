# Loyalty v2 scoped correction

Selected source: I12c1b2cd001f9309a31a887e5c432ca63c373852.
Frozen v1 remains at ../soccer-career-loyalty-v1.

1. Count service only from an appended playing row's recorded employer, onLoanFrom or club. BANNED, BANNED (PED), PRISON and CONVICTED are non-service labels even though the old engine records type playing. A missing contractual service year forfeits the unpaid promise without adding service, changing the fixed final year or extending the contract.
2. An accepted same-club counteroffer makes the selected quote stale. Require a fresh matching key until loyalty is refreshed or cash is selected. A genuinely different actual club offer remains cash eligible.
3. Directly exercise official active and paid save roundtrips. The existing generic serializer retains unknown root fields; no serializer product change is proposed.

Tests were authored first in test-first. Native source inspection and anchor checks only are allowed here. No RED, fixed, unit, type, browser or preservation execution is claimed. Root owns remote qualification.
Existing six positioned application overlays and the 60-pair default-preservation harness remain byte-identical to v1. No current I page replacement, source index write, main change or publication.
