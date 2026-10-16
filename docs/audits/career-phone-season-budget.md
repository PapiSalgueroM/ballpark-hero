# Round 1378: keep the phone's existing season allowance

Source finding, not runtime qualification: `ensurePhone` rebuilds the saved phone without
its existing `bYear`, `bK`, `bP` and `bM` fields. `phoneReply` calls that repair before every
reply. `spend` then sees no saved budget year and resets all three counters. Replying more
than once can therefore exceed the existing karma 4, popularity 1 and direct morale 6
allowances. The three no-perk first answers in `mum_proud` are the proposed direct example.

The proposed correction only retains valid existing budget fields in `ensurePhone`. A
finite numeric year is retained. Finite nonnegative counters retain zero, fractions and
already exhausted or above-cap values. Missing or invalid values remain undefined, so
the existing reset and nullish fallback govern them. No new save field, cap, reward,
dialogue, perk, simulation, RNG or general phone repair is introduced. The phone's existing
shallow thread aliases are a separate preexisting issue, outside this packet.

Plan: freeze twelve actual-API tests and qualify the unchanged source remotely first.
Seven exact missing-budget cases must fail their declared Boolean assertion; five
preservation cases must pass. Then make the minimal correction and require twelve
current passes, the same original-source seven faults/five preserves, and twelve restored
passes. Retain full working inputs, results, draw traces, child exits and source bindings.
Compare all non-budget and non-direct-meter fields across actual source arms. No reward
mock, artificial conversation or rewritten saved dialogue is permitted.

The workflow requires actual application types, the unchanged phone focus proof, original
full phone simulations, build:seo after fixed qualification and all fifteen rebuilt-site
readers, followed by the unchanged full download-budget sweep. The old `simPhone2` 52KB whole-save ceiling is known red on main. Its complete
output and exit are retained; only that exact single known failure may be classified as
preexisting. It is never credited as a green simulation or full-suite pass, and the cap
stays unchanged. Installed package versions, installed file bytes, app/proof sources and
package locks are held. All execution is remote GitHub Actions and offline. No production
query, local application runtime or live-site claim.

Claude I owns integration, publication and the manager competition chain. This bounded
phone repair is reserved in the primary workboard on `codex/career-phone-season-budget`,
parent `d4f2c6f688d656205722ba52bbdb33f03490966a`.

Baseline qualified on proof-only `0804cff9e4e40fec01cd23b1d5c5bbb9ef92abe0`, run
`38895059368`, job `116953434091`. Root reopened actual types (zero diagnostics), all
twelve cases with exactly seven named Boolean faults and five preserves, all 84 full
observations, exact base-phone Git blob, source holds, 521 manifests and installed bytes.
Old phone focus passed twelve cases and `simPhone` passed. Full `simPhone2` completed with
only its unchanged 52KB whole-save assertion red: median 72.3KB, maximum 98.8KB; the phone's
share averaged 7.3KB and peaked at 7.9KB. These are printed measurements, not byte equality.
Artifact `12043921328`, SHA256
`055851dc0f95051930481014d329db09acd2b9104690d12bbe233d9582e06518`, is retained under
`C:/Users/antho/dukb-handoff/2026-10-16/phone-budget-baseline`.

The first baseline on `cd2a3028`, run `38894346052`, qualified the same focused outcomes,
then failed this packet's wrapper: concatenated stdout and stderr put the known size fault
after stdout's final summary. Method-only `0804cff9` checks that summary in original stdout
and retains both streams separately. App, tests and helper stayed held. The failed artifact
`12043202291`, SHA256 `0fc9ce859cca3d6cd52c74a8a9eb856e02685643df79dc54fb6a0926ea19092b`,
is retained separately as `phone-budget-baseline-method-failure`, with no whole-run pass.

After baseline closure, the product adds exactly four optional-field assignments to
`ensurePhone`. The twelve tests, helper and every old simulation stay frozen. Fixed checks
are pending. Compare the resulting full-simulation printed sizes with the retained
baseline and report any movement; an unchanged cap is not an unchanged measured size.
