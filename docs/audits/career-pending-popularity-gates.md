# Queued Soccer Career popularity choices

Round 1376, 2026-10-16. Method candidate only, no runtime result credited yet.

Base: `d4f2c6f688d656205722ba52bbdb33f03490966a`. Branch: `codex/career-pending-popularity-gates`.

Existing Life card 213 can lower popularity by two before another offered card is answered. Cards 225, 234, 241, 243, 244, 248, 253, 256, 257, 268 and 269 rebuild behind numeric popularity gates. A live queue retains callable fallback choices. A JSON save loses those functions, so the same later card can silently skip when the rebuilt catalog no longer offers it. The UI can still toast its saved consequence. Existing card 233 already preserves queued numeric eligibility.

The proposed product scope is only those eleven numeric gates in `src/lib/soccerCareerLife.ts`. A pending ID may preserve its numeric popularity eligibility. Existing age, relationship and story flags remain required. No engine, shared deck, retirement, season, squad, training, save schema, financial gate or real sports data change is included.

The fifteen named test cases use fictional prepared career context and source catalog cards. Each affected card is prepared at its threshold behind actual card 213 and before actual card 220 as a nonterminal continuation. This is an explicitly prepared queue, not evidence of natural picker delivery or a full played career. Actual `applyEventChoice` resolves 213, then every choice of the target is checked against independent literal deltas, full remaining state, retained stamps and queue. Both chance branches are checked with their literal wheel receipts. JSON serialization, the actual save validator and `repairCareer` exercise reload behavior. Original input bytes must remain unchanged.

Baseline qualification requires exactly eleven callback-missing Boolean assertion failures and four preservation passes, with zero setup faults, skipped cases or missing physical reports. The preserves cover original fresh thresholds, unrelated pending cards, six outer age/relationship/story blockers and both existing 233 choices. Fixed qualification requires all fifteen passing, the original complete Life source producing the same eleven causal failures, and all fifteen passing again after restoration. Source copies, current and original hashes, compiled copies, physical JSON reports, raw logs and exact child exits are retained.

Remote Actions also runs the existing saved Life, review and packed-save unit files, real application types, installed dependency bindings and source holds. The fixed phase builds and runs all fifteen rebuilt-site readers. No browser interaction or visual result is claimed. No local runtime, application, database probe, AI validator or competition implementation is authorized by this packet.
