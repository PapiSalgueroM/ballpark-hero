# Segunda Canonical Bridge Implementation Plan

> For agentic workers: use the existing parallel implementation and independent review process, with original tests measured before product changes.

**Goal:** Make 19 verified Club Manager Segunda clubs available as current-era canonical Soccer Career academy and first-contract clubs.

**Architecture:** Derive the static career pool from the existing Club Manager source. Preserve historical eligibility, stored offers and world identity. Resolve Andorran home country separately from its simulated Spanish cup context.

**Tech Stack:** Existing React, TypeScript, generator scripts, Vitest and isolated GitHub Actions.

**Spec:** DoUKnowBall_Game_Expansion_Masterplan.txt, SC-36 and CM-04, partial integration. Owner priority is Soccer Career and Club Manager teams, leagues and listed integrations.

## Global constraints

- All App, parser, Node, browser, build and Git runtime work happens in isolated GitHub Actions. Git mutations use the GitHub connector.
- No production data changes before original owned failures and held cases are independently admitted.
- Facts require two independent sources. Verified colour words are separate from decorative game hex values.
- No new roster, reserve squad, player format, live provider, database, lock, coefficient, RNG site, reset or cap change.
- Old historical states, embedded offers, neutral IDs and played rows remain authoritative.
- The partial 20-club Spanish simulation remains partial.
- Missing or invalid cup years keep legacy behavior. The new temporal rule requires a safe-integer year from 2026.
- No em or en dash in new copy.

## Review focus

1. Old saved offers with neutral IDs must survive load, repair and signing unchanged.
2. Pre-2026 careers and manager jobs must exclude all 19 additions.
3. Home country stays Andorra while only the defined modern Spanish-pyramid cup contexts resolve Spain.
4. Existing hand clubs, generated prefix/order and Girona identity must remain exact.
5. Palette dots must remain readable in the served creation, offer and saved-career screens.

## Execution checkpoints

- [ ] Freeze test-only source and run proper app types plus the six original business cases.
- [ ] Admit actual owned failures, held cases, complete evidence and source/offline holds.
- [ ] Apply the bounded data and source changes below, then regenerate the pool remotely.
- [ ] Verify fixed, original, effective fault and restored outcomes without changing frozen tests.
- [ ] Run affected regressions, normal build, all output readers and unchanged bundle caps.
- [ ] Verify served academy, first-contract, cup, save and reload at phone and desktop widths.
- [ ] Merge the qualified product, publish and check the actual live custom domain.
- [ ] Append release outcomes to the master-list ledger, project state and workboard.

## Source design

# Segunda canonical club bridge: minimal implementation plan

SOURCE ONLY. No App, production data, test, database, remote or runtime changes have been made. Root approved the optional-year cup design. Source peer review and original test-first CI precede implementation.

Audited App ref: `3c1b203034d812b4b8e5f3891328eb09f24e27db`. Root reports current main `3268307038c4586dbc35f4697da1849512b473d9` has only later closure documentation. Before CI, verify protected App blobs below against that actual parent. Master book SC-36/CM-04 remain partial. Frozen facts are in ../masterlist-next-proposals/SOCCER-SEGUNDA-VERIFICATION-MATRIX.json, SHA256 `c4a87f78aded82b1737172f4af788dd6ef7df7743e7d0446868fc5a41a21b6d8`.

## Exact product change

Make 19 existing CM first teams available as canonical SC academy/initial-contract clubs from 2026. Their neutral transfer-world versions already exist. Keep Girona fb-96, all 190 hand rows, all 307 old generated rows/order, old pending offer IDs and stored history. Keep the 20/22 simulated Spanish world, manager-only 22-club size and current player frame. No reserve squads, player/roster imports, playoffs, historic league expansion, coefficient/RNG-site changes, resets or cap increases.

The expected append order is the CM Segunda order with Girona omitted:

1. Real Oviedo: `cm-real-oviedo`
2. Mallorca: `cm-mallorca`
3. Eibar: `cm-eibar`
4. Castellon: `cm-castellon`
5. Almeria: `cm-almeria`
6. Burgos: `cm-burgos`
7. Sabadell: `cm-sabadell`
8. Sporting Gijon: `cm-sporting-gijon`
9. Granada: `cm-granada`
10. Las Palmas: `cm-las-palmas`
11. Tenerife: `cm-tenerife`
12. Leganes: `cm-leganes`
13. Valladolid: `cm-valladolid`
14. Cordoba: `cm-cordoba`
15. Eldense: `cm-eldense`
16. Cadiz: `cm-cadiz`
17. FC Andorra: `cm-fc-andorra`
18. Ceuta: `cm-ceuta`
19. Albacete: `cm-albacete`

Each previously projected neutral ID is the same suffix with `career-lower-` instead of `cm-`. These IDs are lookup history, not migration targets. projectLeagueWorldClubs compares normalized names (LeagueWorld:35,142-169), so fresh lookups should use the canonical row without adding a second club. Never rewrite an existing pending offer or saved current colour. acceptOffer consumes its actual saved offer object (engine:5072-5092).

## Surgical files and anchors

| File | Exact change |
| --- | --- |
| src/lib/clubManager.ts | Add the ten representative colours below to existing CLUB_COLORS (5127 onward). Do not change membership, rosters, strengths, rules or CM_PARTIAL. |
| scripts/lib/careerClubPool.mjs | Remove only HELD_LEAGUES.segunda (67); retain Russia and POOL_COLORS exactly. Add FC Andorra: Andorra to CLUB_COUNTRY (85). POOL_LEAGUE_ROWS already contains Segunda, top:false. |
| scripts/data/soccerCareerFacts.json | Add ten clubColours rows and one clubCountries row using the existing schemas below. Refresh only Segunda leagueWorld.membership and leagueEvidence['Segunda 2026-27'].sources from the fresh LALIGA/AS pair. Replace the unrefreshed full-format lead with the current RFEF full-format source, one host only. Preserve members/order, unnamed/counts, shape/games/points values and all 19 clubSince.held decisions. Extend the colour-about sentence to include Segunda's CM colour rows. Do not re-date global checked or unrelated facts. |
| src/data/soccerCareerClubPool.ts | Regenerate only, no hand editing. Expected 326 generated rows and 516 total fallback clubs; old rows unchanged, one new 20-member Segunda ladder including existing Girona, and 19 new since=2026 pairs. Group/rank layout remains derived from current CM strength/partial data. |
| src/lib/soccerCareerEngine.ts | Add 'Segunda Division' to managerEntryClubInYear's existing Ligue 2/Serie B predicate at8815-8817, retaining ID and CAREER_POOL_SINCE checks. Pass existing season years at the three cup resolver calls listed below. |
| src/lib/soccerCareerCup.ts | Extend existing CROSS_BORDER row shape with optional from. Add Andorra with leagues ['Segunda Division','La Liga'], association Spain, from2026. Add optional third year argument to cupAssociation; a temporal row requires a supplied year >=from. Existing Wales/Monaco and two-argument behaviour stay exact. Pass available years at its two internal calls. |
| scripts/data/domesticCupSources.json | Add only crossBorder.Andorra using existing association/facts/source fields, with a narrow actual2026/27 participation claim and the RFEF plus FC Andorra match sources. Do not alter Spain's cup windows, DOMESTIC_CUPS or its digest. |
| scripts/simCareerDomesticCup.mjs | QA maintenance only: rebind COIN169 and wrongcountry175 to exact new call spans, keeping defect effects/assertions and full inverses. Pass actual row years in association reference checks (372/414/509 and their callers), preserving the historical fleet and thresholds. qa_admission owns the exact test-first/fault plan. |

## Representative palette, not official hex data

clubColours.about already states that the verified fact is the colour WORDS and hex is the game's decorative rendering. All proposed hex values already exist in CM's palette. Use the family indicated here, with no official RGB/Pantone claim or new hue research:

| CM key | Verified words | Game rendering |
| --- | --- | --- |
| Castellón | white and black | `#2b2b2b` (black) |
| Burgos | white and black | `#d9d9d9` (white) |
| Sabadell | blue and white | `#1b458f` (blue) |
| Tenerife | white and blue | `#1b458f` (blue) |
| Leganés | white and blue | `#1b458f` (blue) |
| Córdoba | white and green | `#0a7040` (green) |
| Eldense | blue and grana | `#7d1c2a` (grana) |
| FC Andorra | blue, yellow and red | `#1b458f` (blue) |
| Ceuta | white | `#d9d9d9` (white) |
| Albacete | white | `#d9d9d9` (white) |

Black and white distinguish Castellón/Burgos in a one-colour badge; blue represents the verified blue family of multi-colour clubs; grana/green preserve the other supported families. Existing labels/initials identify clubs independently of colour. Native review must still check readability. No POOL_COLORS growth: CM owns these ten values.

## Required provenance entries

For each ten `clubColours.clubs[SC ASCII name]` entries, use existing fields `colour`, `hex`, `sources`. Each source retains `url,publisher,publisherGroup,read,says,access,locator`, with `published` only when known. Read date is2026-11-05 UTC, distinct from older source publication/season dates. The exact two sources per row and their dates are in the paired plan JSON; use family-word evidence, never attribute the rendering hex to a source.

For `clubCountries.clubs['FC Andorra']`, use `country:'Andorra'` and two source records: the club's2026 legal address and the Govern d'Andorra sports-association register. Home country is separate from Spanish competition jurisdiction. Do not claim a current stadium location.

Fresh membership sources are LALIGA's explicit2026/27 club list and independently owned AS's2026/2027 list, updated3November2026 in this read. Movistar11August2026 independently corroborates all22. Preserve the game's20-first-team subset and omitted reserve identities as partial scope.

The new sole full-format source is RFEF Circular84's annex, explicitly2026/27, Art13/14:22 clubs,42rounds,double round robin,3/1/0 points. The second independent full-format source is still held. LALIGA's2024 general regulation corroborates points only and must not be inserted as a second full-format host. RFEF/FC Andorra calendar headers corroborate42 rounds only. Do not turn them into a full fixture audit.

A3 in simCareerLeagueWorld:825-829 already permits canonical clubs while no player size/table row exists and full-format evidence has fewer than two hosts. Preserve this guard and A1:800-811. No size/format/odd/cadence source changes are needed for this slice.

## Complete dynamic cup path audited

181 SC/career/shared-season production modules were read at the pinned ref, plus the SC page and CM engine. No additional direct dynamic resolver caller was found outside the two files below. Code-search responses were incomplete and are not credited as a repository-wide search; CI must retain a whole-src caller search before product edits to detect any omitted import/re-export.

| Existing call | Pass |
| --- | --- |
| engine:4242 seasonCupAssociation | season.year |
| engine:4304 current-season cup coin | seasonYear |
| engine:6021 worldSeasonTick callback | thisYear, captured by the existing callback |
| Cup:316 cupOpponentPool | year |
| Cup:500 readCupRun opening validation | r.year, already validated as a safe integer |

soccerPhone:1617/1728 consumes the supplied callback and needs no signature change. UI CupRunLines, TrophyCabinet and soccerSeasonCompetitions only consume readCupRun/stored data. SoccerSeasonCentre, SeasonCompetitionPanel and the shared season adapters add no dynamic cup resolver call.

The actual fact covers FC Andorra in the2026/27 Copa while in Segunda. Routing later simulated seasons and a simulated promotion into La Liga is explicitly fictional carry-forward of the verified current rule, not verified future membership/policy. Missing year, pre2026 and Andorran domestic/other league contexts keep legacy resolution. The optional temporal bound does not apply to Wales/Monaco.

readCupRun's stored cup/stages/opening/final remain authoritative. No saved run is regenerated or backfilled. Only opening validation needs the row's existing year; there is no stored association field to migrate. Preserve a valid old generic Andorra run without opening, a named saved Spanish opening, historical/missing metadata vectors and the existing corrupt-opening refusal. repairCareer can delete an unreadable run, so unchanged valid old run/read/repair bytes are a required outcome.

## Generate and qualify

After original owned failures and source peer approval, run remotely `node scripts/genCareerClubPool.mjs --table`. Require exactly the expected generated-file change, the19 appended IDs, unchanged old rows/strength inputs, canonical/neutral deduplication, correct country and current-only eligibility. Run it a second time and require identical generated bytes.

qa_admission owns six proposed test-first cases and the complete fixtures/tapes. Include actual initCareer -> advanceYouthYear -> homegrown offer -> acceptOffer -> serialize/parse/repair, historic manager gating, old neutral pending offer acceptance, new2027+ named Copa/opening readback, legacy/default state and tape preservation, and effective copied-source faults.

Affected checks: simCareerClubPool, simCareerFacts, simCareerLeagueWorld, simCareerDomesticCup, simCareerLeagueFinish, simCareerLeagueSeasons, simCareerAcademy, simCareerDerbies, simSoccerCareerLeagueWorld, simSoccerOfferReview, soccerCupOpening and league-world/save/offer suites. Existing old failures remain unwaived; qualify exact affected outcomes rather than claiming an unfiltered pass. Then proper App TSC, one normal host-compatible build, all output readers and all unchanged caps, actual320/390 touch and1280 keyboard academy/first-contract/cup/save/reload on served assets, photos and public verification. Measure actual SC/CM headroom before adding data. No build or runtime has occurred for this plan.

## Test-first design

# Segunda canonical bridge: original test-first plan

Source-only preparation, 2026-11-04 local task date. No product, data, test, database, remote or runtime change. Source was audited at3c1b203034d812b4b8e5f3891328eb09f24e27db/treee92145c08b3ce3091077818d4c9802c5b7805ea7. Fresh baseline is3268307038c4586dbc35f4697da1849512b473d9/tree6d18d84bcef424def83e496087830c096ba4163b, whose sole parent is3c1b and whose exact four changes are documentation only. Every inventoried product/test/helper blob is unchanged. Rebind the actual baseline head before authoring tests if main moves. Read Data Guardian at .claude/skills/dukb-data-guardian/SKILL.md, bloba4776ef1. Facts remain the frozen51468B matrix, SHAc4a87f78aded82b1737172f4af788dd6ef7df7743e7d0446868fc5a41a21b6d8. The master book supports SC-36 and CM-04 only partially; no card is completed.

Scope:19 canonical academy/first-contract rows from the existing20 named CM Segunda first teams. Existing transfers already project all20, so this adds canonical profiles, not19 previously unavailable transfer destinations. Preserve Girona fb-96, all190 hand rows and308 old generated rows/order, existing current-only decisions, saved IDs/history and the20/22 partial simulated world. No22-team/42-game player upgrade. Keep A1/A3 unchanged. Two independent sources support the relevant colour WORDS, home country and current Copa participation; exact official hex and a second full-format publisher remain held. Palette rendering is presentation, not a newly asserted official code.

## Actual APIs and fixture boundary

The real generator core is deriveCareerClubPool(poolInputs(mod) plus sinceInput(root)); renderPoolFile is the checked-in freshness reader. bundleCareerSources with stubPool:true is the actual generator's existing bootstrap path, not a substitute league model. Use a separate normal bundle with stubPool:false for business outcomes. Do not invoke the writing generator CLI during original admission and do not manually insert candidate clubs into an original business pool.

FALLBACK_CLUBS is HAND_CLUBS followed by CAREER_CLUB_POOL. initCareer(name,nationality,position,era,stats,overall,startYear,clubs,appearance?,potential?,physique?,attrShape?,academyName?) applies adjustClubsForYear. Its optional academyName is accepted only if that row is in the start-year pool. getYouthAcademyClub at overall40..54 admits home-country tier3/4 clubs. All newly derived second-flight rows use tier4. Use a fictional50-OVR Andorran CM with potential90: the fixed real home pool can select FC Andorra; original source has no canonical Andorran academy row and falls back through its actual existing selection path.

Drive initCareer -> advanceYouthYear -> actual homegrown pending offer -> acceptOffer. Do not invent a signFirstContract API, mock an offer generator, or stop original execution at a missing-row lookup. The original still produces its real fallback academy, real offers and a valid signed save; retain these observations before the owned expected-FC-Andorra assertion.

Persistence means serializeSoccerCareerSave -> parseSoccerCareerSave -> isSoccerCareerSave -> repairCareer on an owned parsed frame. repairCareer mutates its input and fills legacy defaults, while acceptOffer and several transitions use shallow copies. Build/warm fixture defaults through the actual constructor/repair path, record that setup separately, and preserve complete persisted JSON rather than pretending every engine helper is immutable. Use owned JSON clones for mutating transitions. Retain original input bytes and all unknown/history fields. Do not require serializing executable callbacks that the real save format omits.

## Small permanent business census

Proposed engine suite: src/test/soccerCareerSegundaBridge.test.ts. Generator qualification should use the existing pure generator helper in a read-only original runner and retain its complete result. Extend existing source/data fences only after original admission. Six business cases are proposed; names/markers below are a plan, not authored tests or measured results.

1. Canonical source and generator census, marker SC_SEGUNDA_CANONICAL_POOL. Capture actual normal derived rows/table/ladder/poolSince and shipped arrays before assertions. Original has no generated Segunda rows and only Girona in the canonical20. Fixed must append exactly19 rows, yielding326 generated/516 combined, with all307 old generated rows as an exact ordered prefix and all190 hand rows unchanged. Compare the20 expected CM names through actual fold/aliases; retain Girona exactly once as fb-96. Every new ID is the actual cm-slugOf name; every new since is2026. Existing ladder groups and since entries stay exact. New palette values come from the CM colour owner, never a new POOL_COLORS override or an official-hex claim.

2. Real academy, first contract and reload, marker SC_SEGUNDA_ACADEMY_PARENT. Run the complete Andorran50-OVR fixture above with real functions and real current pool. Capture initial state, youth result, complete pending offers, chosen actual homegrown offer, accepted state, serialized bytes, parsed/repaired reload and complete action tape before the owned assertion. Require FC Andorra's canonical identity, Andorra home, approved representative colour, league, first-team deal and history retained. All19 rows must also be present in the actual low-OVR eligible country/tier sets; do not promise all19 appear in one random offer draw. Any optional explicit academyName vector must be described as a creation-screen handoff, not random delivery.

3. Existing world destinations become canonical, marker SC_SEGUNDA_CANONICAL_WORLD. Use projectLeagueWorldClubs and clubKeyOf to compare all20 source names, including accented forms, with exactly one profile per identity. Original nineteen neutral career-lower IDs must be observed, not called missing destinations. Fixed new pools use cm- IDs/approved profiles. Exercise real determineLoanOffers/requestTransfer and acceptLoan/acceptOffer on declared complete fixtures. An explicitly prepared pending-offer fixture is acceptable; do not claim natural delivery if its terms were planted. Whole world membership/order/movement is a separate expected hold where its inputs remain tier4 as before. Capture any actual expanded offer/tape differences rather than forcing old offers to match.

4. Historical boundaries and old identities, held case SC_SEGUNDA_HISTORY_HELD. For1990,2010,2025 compare the entire adjusted pool/order to the original. All19 additions remain absent before2026;2026 admits all19. Hold old Serie B/Ligue2 decisions, every old row and Girona's era tier/ID. At a pre2026 first manager-job year, filter real current clubs through managerEntryClubInYear and require no new19. Current engine8815 hardcodes only Ligue2/SerieB, so the candidate needs the bounded Segunda clause identified by the implementation owner. Reinstating the old predicate after rows exist must expose that real leak. A2025 youth start can legitimately reach an expanded2026 contract market: only its pre-boundary steps get exact old parity.

5. Andorra home versus cup jurisdiction, marker SC_SEGUNDA_COUNTRY_CUP. Root approved an optional year on the existing cupAssociation function: Andorra plus the exact Spanish simulated-pyramid league strings Segunda Division or La Liga resolves Spain from2026. This is an explicit fictional carry-forward of verified2026 participation, not a new fact about all future real eligibility. Original admission can call the real function with Reflect.apply and a third year argument, so TypeScript stays valid while the old implementation ignores it. Require Spain/Copa del Rey for both contexts while club/saved country stays Andorra. Two-argument calls, missing or unknown year, pre2026 calls and a clearly fictional unrelated Andorran league keep the old result. Wales/Monaco and ordinary Spanish contexts remain exact. Saved CupRun.cup remains authoritative with no migration: preserve valid generic Andorra runs without opening and old named Spanish runs. readCupRun validates opening.country/league/year, and repairCareer removes invalid runs, so compare complete old rows and reader results as well as raw bytes. Do not alter an old cup name to satisfy the new resolver. No blanket real future or reserve eligibility claim.

6. Loaded offers, saved history and unchanged action paths, held case SC_SEGUNDA_SAVE_HELD. Freeze one complete original save carrying an actual projected neutral lower-club row in pendingOffers and one in pendingLoanOffers, plus valid old season/world/cup history. The legacy embedded club IDs, spellings, country, colour and offer terms must survive parse/repair unchanged. Signing an already saved old offer uses that stored offer; do not rewrite its ID to a new canonical ID. Projecting the new market must not create a second club key. Replay the declared old offer/loan acceptance with the original complete saved-frame reference and action tape. Reuse existing save/loan/contract fixture conventions, not a hand-written partial CareerState. Add a small historical default career that finishes before2026, and a pure Spanish world vector proving20 members,38-game cap, direct3 swaps and simulated-partial saved records. Preserve each played row after later movement. League-world helpers must consume no main Math.random, as the current tests already assert.

Expected from source inspection only: cases1/2/3 and case5 should own feature-absence failures; cases4/6 should hold. Actual original native exits, full names, counts and failure ownership must be measured before any product/data edit. A setup/type/import error is never an owned red. If this approved cup contract changes, revise this source-only plan before freezing a test census.

## Full evidence, controls and restoration

Before each owned business assertion, write full observations even on original source. Keep setup/import draws separate from action draws; retain consumed values and normalized production call sites, every complete persisted input/output/reference and serializer bytes. Record the real phone seed and existing defaults. For unchanged historical/loaded paths demand entire saved-frame/byte and action-tape equality across original/fixed/restored. For current expanded-pool paths retain the actual new outcomes and tapes, disclose the expected divergence, and require complete fixed/restored equality. Do not alter a production RNG site, seed rule, coefficient or sample limit to obtain parity.

Use effective changed-data controls through the same guards: omit one actual candidate row, swap an old ordered pair, remove one new since boundary, restore the old manager filter after rows exist, corrupt FC Andorra's country or its scoped cup context, and return one approved CM colour to fallback grey. Check each change really occurred, require the named owning assertion/data-fence error rather than a setup failure, and restore the entire copied/source body exactly. Reinstating the Segunda league hold is the same missing-canonical mechanism affecting several cases, not several independent fault classes. No mocked business return values or golden rewrites.

After original source/type/offline admission, the next phase may author test-first only, run original remotely, and then permit the bounded implementation. Relevant existing checks to preserve are simCareerClubPool/Facts/LeagueWorld/LeagueFinish/LeagueSeasons/Academy/Eras/DomesticCup, current world/creation/contract/saved-loan/save/cup-opening tests and the source's existing historical fixtures. Their seeds/limits/assertions stay held. Proper app TSC, normal host-compatible build, all rebuilt-output readers, all unchanged caps and served native/public sign/save/reload come later. No cap increase, CM first-screen import, new roster, optimizer, provider, database, lock change or active-save reset.

## Review rulings

The independent source review found no blocking design issue. The original held historical case does not require new 2026 club presence; that assertion belongs to the owned canonical-pool case. The temporal cup resolver requires a safe-integer year. Two-argument calls, invalid years, historical years and unrelated league contexts keep legacy behavior.

No SC-36 or CM-04 completion is claimed by this slice.

## Reachable creation screen integration

The source review found that the newest selectable start was 2025. Root expanded this slice within the owner's existing soccer expansion instruction so the verified 2026 academy pool is reachable in the actual creation screen.

- Add Andorra alphabetically to the existing nationality selector. Existing nationality options remain available.
- Preserve the 2025 era value and start year, label it "2025 start", and append value "2026" with label "Current era (2026 start)" and startYear 2026.
- The existing eraDefFor function already maps 2026 into its 2025-2029 window. Keep all eight underlying era definitions and the save codec unchanged.
- Update only simCareerEras' creation-picker count to nine, retaining its separate eight-era engine assertion and all historical checks.
- Add one real creation-screen UI case in src/test/soccerCareerSegundaCreation.test.tsx. The original census becomes seven cases, five owned feature-absence failures and two held cases. The actual original report determines admission.
- Retain the historical 2025 start and its current-only club gate. No loaded save changes or automatic era selection are introduced.

This decision closes a concrete user-access gap. It does not expand the underlying historical league data or assert a new competition format.

## Measured original census correction

Original run 41957684457 executed the untouched App after proper types passed. Its seven business cases produced the five named feature-absence AssertionErrors and two historical/save passes. Full canonical evidence measured 190 hand clubs and 307 generated clubs, 497 combined. The planning count of 308 generated was wrong. The read-only evidence reader stopped at that count check before generator qualification, so this attempt is partial.

Before any product change, correct only the original and resulting total/prefix constants to 307 old generated, 326 generated after the same 19 additions, and 516 combined. Preserve the prior test and reader, all seven case names, all business assertions, seeds, raw outcomes and source holds. Rerun original qualification with the corrected count metadata and retain both attempts. This correction does not remove or add a club.
