# Club Manager Shirt Sales Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Earn and explain simulated net shirt-sales income without duplicate payments or lost old books.

**Architecture:** Extend the existing finance module at tickBooks. Keep one optional integer-penny retail ledger, pure quote/settlement readers and one cash-only projection row. Keep the shared engine and its calendar unchanged.

**Tech Stack:** Existing React, TypeScript, Vitest, esbuild harnesses and remote Actions.

**Spec:** docs/design/round-1443-shirt-sales.md

## Global Constraints

Remote offline app execution only. No real sports data, likenesses, logos or external assets. No engine/calendar/world/BO edits, new dependencies or cap increases. No historical income on load. Keep all old assertions except explicit new-income accounting adjustments with measured baseline evidence. Preserve old failed/skipped outcomes honestly.

## Review Focus

Old v1 and malformed optional blocks; small receipts and same-club carry; charged weeks versus night entries; net versus gross/cost double counting; displayed fan input and random stream. Every condition has a required outcome test below.

### Task 1: original outcome and calibration evidence

Files: new src/lib/clubManagerShirtSales.test.ts, src/test/clubManagerShirtSalesScreen.test.tsx, scripts/measureCmShirtSalesBaseline.mjs and .github/workflows/cm-shirt-sales.yml.

- [ ] Write original assertions through existing real APIs: a charged week has a retail record, the finance projection exposes paid-net cash, and the actual desk explains shirt sales. Do not import a missing future module.
- [ ] Observe exact intended assertion failures on unchanged e132 product in remote CI. Reject setup, import or compiler errors as evidence.
- [ ] Run the unchanged finance, sponsor, meter and hub baseline checks. Measure bounded current-state samples under seeds0-7 and held-out8-15 across existing modern/historical/custom strata. Report actual fixture IDs, charged weeks, gates, sponsorship, budgets, missing strata and completed/stopped/truncated counts.
- [ ] Dry-evaluate compact fictional rate candidates without changing state or RNG. Select model/rates from measured first-payment delay and income ratios, retain zero-denominator cases, then write the chosen units and arithmetic example into the design before product implementation.

### Task 2: weekly finance and literal regression proof

File: src/lib/clubManagerFinances.ts; tests in the two new files; new scripts/simCmShirtSales.mjs.

- [ ] Add the optional penny ledger and smallest pure readers/settlement needed. Keep books version and mandatory legacy fields. Weekly tick credits only recorded net cash, once.
- [ ] Prove literal tiny receipt, exact threshold, multi-batch residual, budget delta, old-save no-backpay, pure repeated read/reload, real charged weeks/night exclusion, same-club carry/move, correct fan input, estimate count, malformed source and RNG behavior.
- [ ] Add only paid cash once to projected/closed income and kittyChange. Leave production costs out of board cover.
- [ ] Run actual normal tests and effective copied faults for rounding loss, gross credit, duplicate/missing deposit, backpay, night clock, wrong mood and carry. Each fault must change its intended target and fail its own behavioral assertion.

### Task 3: readable finance desk

Files: FinancesScreen.tsx, narrow ClubManagerHelp.tsx and clubManagement.ts commercial text, final WhatsNew.tsx entry.

- [ ] Render exact gross/cost/net/paid/pending values using existing currency formatting, labelled simulated figures. Add short rule and a literal worked example. Keep layout and existing callbacks.
- [ ] Test the actual component with exact fixtures, legacy and unavailable cases. Check phones360/390/432 and reduced motion, focus, saved bytes and no scroll jump. Review actual saved PNGs.

### Task 4: held checks and qualification

Files: only explicit new-income assertions in simFinance.mjs, simClubManagerFinances.mjs and clubManagerHubLines.test.ts if required by measured outcomes.

- [ ] Subtract recorded paid-retail delta before the unchanged gate identity; retain away/neutral residual and double-credit checks. Do not put shirts into the gate model.
- [ ] Preserve all inherited controls, staff/sponsor/meter/save and hub contracts. Classify any existing night-count mismatch only after actual baseline output.
- [ ] Run real app types, full units, serial production/SEO build, all rebuilt-page readers and all14 unchanged caps. Run the meaningful existing finance/CM suites with retained full output. No harness may read a half-built dist.
- [ ] Independent source/evidence review, exact generated adoption and complete inverses. Update state/board with actual results and limits.

### Task 5: ship

- [ ] Create/attach reviewed PR, merge exact qualified head, wait for host exact source ready and publish.
- [ ] Verify actual public deployment/pages/assets and crawler audit with bounded public GET/HEAD. Notify search engines only after successful readback. Close docs without a second product publish.
